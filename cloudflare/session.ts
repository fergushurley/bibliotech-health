import { createWorkflow, type Progress } from "../lib/workflow-service";
import { SessionStore } from "./store";
import { publicMemory } from "./memory";
import { apiJson, SESSION_SECONDS } from "./api";

export class HealthDemoSession {
  private store: SessionStore;
  private workflow: ReturnType<typeof createWorkflow>;
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;

  constructor(private ctx: DurableObjectState) {
    this.store = new SessionStore(ctx.storage);
    this.workflow = createWorkflow(this.store, publicMemory);
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const task = this.queue.then(work, work);
    this.queue = task.catch(() => {});
    return task;
  }

  async fetch(request: Request) {
    if (this.pending >= 5) return apiJson({ error: "Your demo is busy. Please try again shortly." }, 429);
    this.pending++;
    try { return await this.exclusive(() => this.handle(request)); }
    finally { this.pending--; }
  }

  private async handle(request: Request): Promise<Response> {
    if (!(await this.ctx.storage.getAlarm()))
      await this.ctx.storage.setAlarm(Date.now() + SESSION_SECONDS * 1000);
    if (request.method === "GET") return apiJson(await this.workflow.getState(false));
    try {
      const reader = request.body?.getReader();
      if (!reader) return apiJson({ error: "Missing action." }, 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) {
          await reader.cancel();
          return apiJson({ error: "Action is too large." }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== "object" || !("action" in body) ||
          !["prepare", "import", "fresh", "reset", "check", "sync"].includes(String(body.action)))
        return apiJson({ error: "Unknown demo action." }, 400);
      if ("resetGBrain" in body && body.resetGBrain === true)
        return apiJson({ error: "Remote memory reset is unavailable in this public demo." }, 400);
      const now = Date.now();
      let rate = await this.ctx.storage.get<{ start: number; count: number }>("rate");
      if (!rate || now - rate.start >= 60000) rate = { start: now, count: 0 };
      if (rate.count >= 30) return apiJson({ error: "Please wait a minute before trying more demo actions." }, 429);
      await this.ctx.storage.put("rate", { ...rate, count: rate.count + 1 });
      if (body.action === "prepare" || body.action === "import") {
        const events: Progress[] = [];
        const emit = (event: Progress) => events.push(event);
        if (body.action === "prepare") await this.workflow.prepareBrief(emit);
        else await this.workflow.importFollowup("record" in body ? body.record : undefined, emit);
        return new Response(events.map(event => JSON.stringify(event)).join("\n") + "\n", {
          headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "private, no-store" },
        });
      }
      if (body.action === "fresh") return apiJson(await this.workflow.freshSession());
      if (body.action === "reset") return apiJson(await this.workflow.resetDemo(false));
      if (body.action === "sync") return apiJson(await this.workflow.syncMemory());
      return apiJson(await this.workflow.getState());
    } catch (error) {
      return apiJson({ error: error instanceof SyntaxError ? "Invalid JSON action." :
        error instanceof Error && error.message.startsWith("Select the supplied") ? error.message :
        "Unable to complete the demo action. Please try again." }, 400);
    }
  }

  async alarm() {
    await this.exclusive(async () => { await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm(); });
  }
}

// Keep the earlier prototype's class available until its existing sessions expire.
export class DemoSession {
  constructor(private ctx: DurableObjectState) {}
  async fetch() { return apiJson({ error: "Open /health to start the updated demo." }, 410); }
  async alarm() { await this.ctx.storage.deleteAll(); await this.ctx.storage.deleteAlarm(); }
}
