import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/client/stdio";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { HealthMemory, MemoryEntry } from "../../core/src/index";
export const GBRAIN_ENDPOINT = "https://gbrain.io/mcp";
export const memorySchema = z.object({
  key: z.string(),
  namespace: z.string(),
  patientId: z.string(),
  title: z.string(),
  statement: z.string(),
  evidenceIds: z.array(z.string()).min(1),
  status: z.enum(["verified", "patient_reported", "inferred", "unresolved"]),
  lifecycle: z.enum(["open", "resolved", "reviewed"]),
  updatedAt: z.string(),
  sourceDates: z.array(z.string()),
  providerId: z.string().optional(),
  recalledAt: z.string().optional(),
});
export interface MemoryOperation {
  tool: string;
  result: "allowed" | "failed";
  durationMs: number;
  mode: "read" | "write";
}
export class MemoryUnavailable extends Error {}
export class MemoryNotFound extends Error {}
export function decodeResult(result: any): any {
  if (result.structuredContent) return result.structuredContent;
  const text = (result.content ?? [])
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
  for (const block of result.content ?? []) {
    if (block.type === "text") {
      try {
        return JSON.parse(block.text);
      } catch {
        /* A separate human-readable diagnostic may follow the JSON. */
      }
    }
  }
  return { text };
}
const start = "<!-- bibliotech:start -->";
const end = "<!-- bibliotech:end -->";
export function encodeMemory(entry: MemoryEntry): string {
  const clean = memorySchema.parse(entry);
  delete clean.providerId;
  delete clean.recalledAt;
  return `${start}\n## ${clean.title}\n\nSynthetic patient intelligence · ${clean.lifecycle}\n\n${clean.statement}\n\nEvidence: ${clean.evidenceIds.join(", ")}\n\nSource dates: ${clean.sourceDates.join(", ")}\n\nEvidence status: ${clean.status}\n\nUpdated: ${clean.updatedAt}\n\n\`\`\`bibliotech-memory\n${JSON.stringify(clean, null, 2)}\n\`\`\`\n${end}`;
}
export function decodeMemory(text: string, providerId: string): MemoryEntry {
  const match = text.match(/```bibliotech-memory\s*([\s\S]*?)```/);
  if (!match)
    throw new MemoryUnavailable(
      "The retrieved note is not a BiblioTech memory entry.",
    );
  return {
    ...memorySchema.parse(JSON.parse(match[1])),
    providerId,
    recalledAt: new Date().toISOString(),
  };
}
export class GBrainMemory implements HealthMemory {
  private client = new Client({ name: "bibliotech-health", version: "0.1.0" });
  private tools: any[] = [];
  private connected = false;
  constructor(
    private token: string | undefined,
    private onOperation?: (event: MemoryOperation) => void | Promise<void>,
  ) {}
  async connect() {
    if (this.connected) return;
    const local = process.env.GBRAIN_MODE === "local";
    if (!local && !this.token?.trim())
      throw new MemoryUnavailable(
        "GBrain is not connected. Add GBRAIN_TOKEN to the project .env.local with Full memory access.",
      );
    const binary = process.env.GBRAIN_BIN;
    if (local && !binary)
      throw new MemoryUnavailable(
        "Set GBRAIN_BIN to the absolute path of your installed GBrain CLI.",
      );
    const transport = local
      ? new StdioClientTransport({
          command: binary!,
          args: ["serve", "--surface", "full"],
          env: {
            ...getDefaultEnvironment(),
            GBRAIN_SWEEP: "0",
            PATH: `${path.dirname(binary!)}:${process.env.PATH ?? ""}`,
          },
          stderr: "ignore",
        })
      : new StreamableHTTPClientTransport(new URL(GBRAIN_ENDPOINT), {
          authProvider: { token: async () => this.token! },
          onInsufficientScope: "throw",
          fetch: async (input, init) =>
            fetch(input, {
              ...init,
              redirect: "error",
              signal: AbortSignal.any([
                ...(init?.signal ? [init.signal] : []),
                AbortSignal.timeout(15000),
              ]),
            }),
        });
    try {
      await this.client.connect(transport);
      let cursor: string | undefined;
      do {
        const page = await this.client.listTools(
          cursor ? { cursor } : undefined,
        );
        this.tools.push(...page.tools);
        cursor = page.nextCursor;
      } while (cursor);
      this.connected = true;
    } catch {
      await this.client.close().catch(() => {});
      throw new MemoryUnavailable(
        "GBrain connection failed. Check the selected GBrain installation or hosted connection permissions.",
      );
    }
  }
  async inspect() {
    await this.connect();
    return this.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }
  private assertTool(name: string, args: Record<string, unknown>) {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool)
      throw new MemoryUnavailable(
        `This connection does not expose ${name}. Enable the documented GBrain page/search tools; no substitute write was attempted.`,
      );
    const props = tool.inputSchema.properties ?? {};
    for (const key of Object.keys(args))
      if (!(key in props))
        throw new MemoryUnavailable(
          `GBrain ${name} has an incompatible schema for ${key}. Run npm run gbrain:inspect.`,
        );
    for (const key of tool.inputSchema.required ?? [])
      if (!(key in args))
        throw new MemoryUnavailable(
          `GBrain ${name} requires ${key}. Run npm run gbrain:inspect.`,
        );
  }
  private async call(
    name: string,
    args: Record<string, unknown>,
    write = false,
  ) {
    await this.connect();
    this.assertTool(name, args);
    const began = Date.now();
    let result: "allowed" | "failed" = "failed";
    try {
      const response = await this.client.callTool(
        { name, arguments: args },
        { timeout: 15000 },
      );
      const data = decodeResult(response);
      if (response.isError || data?.error) {
        if (/page_not_found|Page not found/i.test(JSON.stringify(data)))
          throw new MemoryNotFound("BiblioTech note does not exist yet.");
        throw new MemoryUnavailable(
          `GBrain ${name} was refused or failed. Check the connection’s Activity page.`,
        );
      }
      result = "allowed";
      return data;
    } finally {
      const event = {
        tool: name,
        result,
        durationMs: Date.now() - began,
        mode: write ? ("write" as const) : ("read" as const),
      };
      console.error(JSON.stringify({ provider: "gbrain", ...event }));
      await this.onOperation?.(event);
    }
  }
  async search(namespace: string): Promise<MemoryEntry[]> {
    const data = await this.call("search", { query: namespace });
    const rows = Array.isArray(data)
      ? data
      : (data.results ?? data.data?.results);
    if (!Array.isArray(rows))
      throw new MemoryUnavailable(
        "GBrain search returned an unsupported response shape.",
      );
    const entries: MemoryEntry[] = [];
    const seen = new Set<string>();
    for (const row of rows.slice(0, 20)) {
      const slug = row.slug ?? row.page_slug;
      if (
        typeof slug === "string" &&
        !slug.startsWith(`bibliotech/${namespace}/`)
      )
        continue;
      const id = row.id ?? slug;
      if (typeof id !== "string" || seen.has(id)) continue;
      seen.add(id);
      const page = await this.call("fetch", { id });
      if (typeof page.text !== "string")
        throw new MemoryUnavailable(
          "GBrain fetch did not return canonical note text.",
        );
      if (!page.text.includes("```bibliotech-memory")) continue;
      const entry = decodeMemory(page.text, id);
      if (entry.namespace === namespace) entries.push(entry);
    }
    return entries;
  }
  async get(id: string): Promise<MemoryEntry> {
    const page = await this.call("get_page", {
      slug: id,
      include_content: true,
    });
    return decodeMemory(page.content ?? page.compiled_truth ?? "", id);
  }
  async remember(entry: MemoryEntry): Promise<MemoryEntry> {
    memorySchema.parse(entry);
    if (!entry.key.startsWith(`bibliotech/${entry.namespace}/`))
      throw new Error("Memory key must belong to the active demo namespace.");
    await this.connect();
    let previous: any;
    try {
      previous = await this.call("get_page", {
        slug: entry.key,
        include_content: true,
      });
    } catch (error) {
      if (!(error instanceof MemoryNotFound)) throw error;
    }
    let content = `---\ntitle: ${JSON.stringify(entry.title)}\ntype: note\n---\n\n${encodeMemory(entry)}\n`;
    if (previous) {
      const canonical = previous.content;
      if (
        typeof canonical !== "string" ||
        !canonical.includes(start) ||
        !canonical.includes(end)
      )
        throw new MemoryUnavailable(
          "Existing page is not an owned BiblioTech note; it will not be overwritten.",
        );
      const existing = decodeMemory(canonical, entry.key);
      if (existing.namespace !== entry.namespace || existing.key !== entry.key)
        throw new MemoryUnavailable("Memory namespace mismatch.");
      content =
        canonical.slice(0, canonical.indexOf(start)) +
        encodeMemory(entry) +
        canonical.slice(canonical.indexOf(end) + end.length);
    }
    const args: Record<string, unknown> = { slug: entry.key, content };
    const props =
      this.tools.find((t) => t.name === "put_page")?.inputSchema.properties ??
      {};
    if ("request_id" in props) args.request_id = randomUUID();
    if (previous) {
      if (!("expected_revision" in props) || previous.revision === undefined)
        throw new MemoryUnavailable(
          "GBrain revision-safe update is unavailable; the existing note was not overwritten.",
        );
      args.expected_revision = previous.revision;
    }
    await this.call("put_page", args, true);
    const saved = await this.get(entry.key);
    if (
      saved.updatedAt !== entry.updatedAt ||
      saved.lifecycle !== entry.lifecycle ||
      JSON.stringify(saved.evidenceIds) !== JSON.stringify(entry.evidenceIds)
    )
      throw new MemoryUnavailable(
        "GBrain write could not be verified by rereading. Retry memory synchronization.",
      );
    return saved;
  }
  async resolve(entry: MemoryEntry) {
    if (entry.lifecycle !== "resolved")
      throw new Error("Resolution requires resolved lifecycle.");
    return this.remember(entry);
  }
  async close() {
    await this.client.close();
    this.connected = false;
  }
}
