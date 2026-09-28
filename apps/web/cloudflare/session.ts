import {
  HealthWorkflow,
  safeError,
} from "../../../packages/core/src/workflow-service";
import { createMemory } from "../../../packages/core/src/memory";
import {
  normalizePatient,
  normalizeRecords,
  evidenceFor,
} from "../../../packages/fhir/src/index";
import { SessionStore } from "./store";
import { apiJson, SESSION_SECONDS, type Env } from "./api";

export class DemoSession {
  private store: SessionStore;
  private workflow: HealthWorkflow;
  private queue: Promise<unknown> = Promise.resolve();
  private pending = 0;

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.store = new SessionStore(ctx.storage);
    this.workflow = new HealthWorkflow({
      store: this.store,
      memory: (id) => createMemory(this.store, id, env.GBRAIN_TOKEN),
      // Reset applies only to this browser's synthetic session.
      allowReset: true,
    });
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.queue.then(operation);
    this.queue = task.catch(() => {});
    return task;
  }

  async fetch(request: Request) {
    if (this.pending >= 5)
      return apiJson(
        { error: "Your demo is busy. Please try again shortly." },
        429,
      );
    this.pending++;
    try {
      return await this.exclusive(() => this.handle(request));
    } finally {
      this.pending--;
    }
  }

  private async handle(request: Request) {
    if (!(await this.ctx.storage.getAlarm()))
      await this.ctx.storage.setAlarm(Date.now() + SESSION_SECONDS * 1000);
    if (request.method === "GET") {
      const state = await this.store.read();
      return apiJson({
        ...state,
        resources: undefined,
        patient: normalizePatient(
          state.resources.find((r) => r.resourceType === "Patient")!,
        ),
        events: normalizeRecords(state.resources),
        evidence: evidenceFor(state.resources),
        tokenConfigured: !!this.env.GBRAIN_TOKEN,
        development: false,
        publicDemo: true,
        canReset: true,
      });
    }
    try {
      const reader = request.body?.getReader();
      if (!reader) return apiJson({ error: "Missing action." }, 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 1024) {
          await reader.cancel();
          return apiJson({ error: "Action is too large." }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || typeof body !== "object" || !("action" in body))
        return apiJson({ error: "Invalid action." }, 400);
      const { action } = body;
      const id = "id" in body ? body.id : undefined;
      if (
        typeof action !== "string" ||
        ![
          "prepare",
          "import",
          "retry",
          "recall",
          "review",
          "fresh",
          "reset",
          "deny",
        ].includes(action)
      )
        return apiJson({ error: "Unknown action." }, 400);
      if (action === "review" && (typeof id !== "string" || id.length > 100))
        return apiJson({ error: "Invalid finding." }, 400);

      const now = Date.now();
      let rate = await this.ctx.storage.get<{ start: number; count: number }>(
        "rate",
      );
      if (!rate || now - rate.start >= 60000) rate = { start: now, count: 0 };
      if (rate.count >= 30)
        return apiJson(
          { error: "Please wait a minute before trying more demo actions." },
          429,
        );
      await this.ctx.storage.put("rate", { ...rate, count: rate.count + 1 });

      let result;
      switch (action) {
        case "prepare":
          result = await this.workflow.prepareVisit();
          break;
        case "import":
          result = await this.workflow.importFollowUp();
          break;
        case "retry":
          result = await this.workflow.retryMemory();
          break;
        case "recall":
          result = await this.workflow.recallMemory();
          break;
        case "review":
          result = await this.workflow.markReviewed(id as string);
          break;
        case "fresh":
          result = await this.workflow.freshSession();
          break;
        case "reset":
          result = await this.workflow.resetDemo();
          break;
        case "deny":
          result = await this.workflow.denyResearch();
          break;
      }
      return apiJson({ result });
    } catch (error) {
      return apiJson(
        {
          error:
            error instanceof SyntaxError
              ? "Invalid JSON action."
              : safeError(error),
        },
        400,
      );
    }
  }

  async alarm() {
    await this.exclusive(async () => {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    });
  }
}
