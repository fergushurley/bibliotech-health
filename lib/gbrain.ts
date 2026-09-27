import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { z } from "zod";
import { PATIENT_ID } from "./data";
import type { Connection, HealthMemoryEntry } from "./types";
const entrySchema = z.object({
  id: z.string(),
  patientId: z.literal(PATIENT_ID),
  category: z.enum([
    "follow_up",
    "finding",
    "medication",
    "preference",
    "resolved_question",
  ]),
  title: z.string(),
  statement: z.string(),
  status: z.enum(["open", "resolved", "reviewed"]),
  evidenceIds: z.array(z.string()).min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  resolvedByEvidenceId: z.string().optional(),
});
const snapshotSchema = z.object({
  schema: z.literal("bibliotech-memory-v1"),
  entity: z.string(),
  version: z.iso.datetime(),
  entries: z.array(entrySchema),
  importedFollowup: z.boolean(),
});
type Snapshot = z.infer<typeof snapshotSchema>;
const prefix = "BIBLIOTECH_MEMORY_V1\n";
export function decodeSnapshots(facts: unknown[], entity: string) {
  return facts
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const fact = raw as Record<string, unknown>;
      const value = fact.fact ?? fact.content ?? fact.text;
      if (typeof value !== "string" || !value.startsWith(prefix)) return [];
      try {
        const parsed = snapshotSchema.parse(
          JSON.parse(value.slice(prefix.length)),
        );
        if (parsed.entity !== entity) return [];
        return [{ ...parsed, remoteId: String(fact.fact_id ?? fact.id ?? "") }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.version.localeCompare(a.version));
}
function unpack(
  result: Awaited<ReturnType<Client["callTool"]>>,
): Record<string, unknown> {
  if (result.isError)
    throw new Error(
      "GBrain rejected the memory operation. Check the client’s Memory permissions.",
    );
  if (result.structuredContent)
    return result.structuredContent as Record<string, unknown>;
  for (const block of result.content) {
    if (block.type === "text") {
      try {
        const parsed = JSON.parse(block.text);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        /* A non-JSON response cannot prove persistence. */
      }
    }
  }
  throw new Error(
    "GBrain returned an unsupported memory response. No persistent state was assumed.",
  );
}
async function withBrain<T>(
  action: (
    client: Client,
    names: Record<string, string>,
    entity: string,
  ) => Promise<T>,
): Promise<T> {
  const token = process.env.GBRAIN_TOKEN;
  if (!token)
    throw new Error(
      "GBrain isn't connected. Configure a synthetic-demo Memory connection to enable persistent memory.",
    );
  const endpoint = new URL(
    process.env.GBRAIN_MCP_URL || "https://gbrain.io/mcp",
  );
  if (
    endpoint.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(endpoint.hostname)
  )
    throw new Error("GBrain requires HTTPS outside localhost.");
  const client = new Client(
    { name: "bibliotech-health-alternative", version: "0.1.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    fetch: async (input, init) =>
      fetch(input, {
        ...init,
        signal: AbortSignal.any([
          ...(init?.signal ? [init.signal] : []),
          AbortSignal.timeout(12000),
        ]),
      }),
  });
  try {
    await client.connect(transport);
    const available = await client.listTools();
    const names: Record<string, string> = {};
    for (const verb of ["recall", "remember", "forget"]) {
      const matches = available.tools.filter(
        (t) =>
          t.name === verb ||
          t.name.endsWith(`__${verb}`) ||
          t.name.endsWith(`_${verb}`),
      );
      if (matches.length === 1) names[verb] = matches[0].name;
    }
    if (!names.recall || !names.remember)
      throw new Error(
        "GBrain Memory recall and remember tools are unavailable. Add the synthetic workspace’s Memory application with Full permission.",
      );
    return await action(
      client,
      names,
      process.env.GBRAIN_ENTITY ||
        "projects/bibliotech-alternative/demo-jordan-taylor",
    );
  } finally {
    await client.close().catch(() => {});
  }
}
async function recall(
  client: Client,
  names: Record<string, string>,
  entity: string,
) {
  const result = unpack(
    await client.callTool({
      name: names.recall,
      arguments: { entity, limit: 100 },
    }),
  );
  if (result.error || !Array.isArray(result.facts))
    throw new Error(
      "GBrain recall did not return a verifiable facts list. Persistent memory is unavailable.",
    );
  return decodeSnapshots(result.facts, entity);
}
export async function readMemory(): Promise<{
  connection: Connection;
  memory: HealthMemoryEntry[];
  importedFollowup: boolean;
}> {
  try {
    return await withBrain(async (client, names, entity) => {
      const snapshots = await recall(client, names, entity);
      const latest = snapshots[0];
      return {
        connection: {
          connected: true,
          message: "Memory read from GBrain.",
          checkedAt: new Date().toISOString(),
          workspaceUrl: process.env.GBRAIN_WORKSPACE_URL || undefined,
        },
        memory:
          latest?.entries.map((e) => ({ ...e, remoteId: latest.remoteId })) ??
          [],
        importedFollowup: latest?.importedFollowup ?? false,
      };
    });
  } catch (error) {
    return {
      connection: {
        connected: false,
        message:
          error instanceof Error ? error.message : "GBrain is unavailable.",
        checkedAt: new Date().toISOString(),
      },
      memory: [],
      importedFollowup: false,
    };
  }
}
export async function writeMemory(
  entries: HealthMemoryEntry[],
  importedFollowup: boolean,
) {
  return withBrain(async (client, names, entity) => {
    const snapshot: Snapshot = snapshotSchema.parse({
      schema: "bibliotech-memory-v1",
      entity,
      version: new Date().toISOString(),
      entries,
      importedFollowup,
    });
    const result = unpack(
      await client.callTool({
        name: names.remember,
        arguments: {
          fact: prefix + JSON.stringify(snapshot),
          entity,
          provenance:
            "BiblioTech Health synthetic FHIR R4 demo; evidence IDs are stored on every memory entry.",
          kind: "fact",
          visibility: "world",
        },
      }),
    );
    if (result.error) throw new Error("GBrain memory write failed.");
    const retrieved = (await recall(client, names, entity)).find(
      (s) => s.version === snapshot.version,
    );
    if (
      !retrieved ||
      JSON.stringify(retrieved.entries) !==
        JSON.stringify(snapshotSchema.parse(snapshot).entries)
    )
      throw new Error(
        "GBrain write could not be verified by a separate recall. Retry synchronization.",
      );
    return retrieved.entries.map((e) => ({
      ...e,
      remoteId: retrieved.remoteId,
    }));
  });
}
export async function resetRemoteMemory() {
  return withBrain(async (client, names, entity) => {
    if (!names.forget)
      throw new Error("This GBrain connection cannot forget demo memory.");
    const snapshots = await recall(client, names, entity);
    for (const snapshot of snapshots) {
      if (!snapshot.remoteId)
        throw new Error(
          "A demo snapshot has no remote ID; refusing to reset unrelated memory.",
        );
      const result = unpack(
        await client.callTool({
          name: names.forget,
          arguments: {
            id: snapshot.remoteId,
            reason:
              "Explicitly confirmed reset of BiblioTech synthetic demo memory.",
          },
        }),
      );
      if (result.error) throw new Error("GBrain reset failed.");
    }
    if ((await recall(client, names, entity)).length)
      throw new Error(
        "Some demo snapshots remain. Reset could not be verified.",
      );
  });
}
