import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GBrainMemory } from "../packages/gbrain-health-memory/src/index";
import { loadToken } from "../packages/core/src/workflow";
import { projectRoot } from "../packages/core/src/store";
import type { MemoryEntry } from "../packages/core/src/index";
const memory = new GBrainMemory(loadToken());
try {
  if (process.argv[2] === "inspect") {
    const tools = await memory.inspect();
    await fs.mkdir(path.join(projectRoot(), ".data"), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot(), ".data", "gbrain-tools.json"),
      JSON.stringify(tools, null, 2),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify(
        {
          endpoint:
            process.env.GBRAIN_MODE === "local"
              ? "local MCP over stdio"
              : "https://gbrain.io/mcp",
          tools: tools.map((t) => ({
            name: t.name,
            required: t.inputSchema.required,
          })),
          schemaFile: ".data/gbrain-tools.json",
        },
        null,
        2,
      ),
    );
  } else if (process.argv[2] === "verify") {
    const namespace = `bibliotech-verification-${randomUUID()}`;
    const entry: MemoryEntry = {
      key: `bibliotech/${namespace}/follow-up`,
      namespace,
      patientId: "jordan-taylor-synthetic",
      title: "Synthetic integration verification",
      statement:
        "Synthetic source-linked follow-up question for adapter verification.",
      evidenceIds: ["DiagnosticReport/mammogram-2026-03"],
      status: "unresolved",
      lifecycle: "open",
      updatedAt: new Date().toISOString(),
      sourceDates: ["2026-03-12"],
    };
    await memory.search(namespace);
    const created = await memory.remember(entry);
    const updated = await memory.resolve({
      ...entry,
      lifecycle: "resolved",
      status: "verified",
      statement: "Synthetic verification: the matching report is now present.",
      evidenceIds: [
        ...entry.evidenceIds,
        "DiagnosticReport/followup-mammogram-2026-09",
      ],
      sourceDates: [...entry.sourceDates, "2026-09-18"],
      updatedAt: new Date().toISOString(),
    });
    await memory.close();
    const fresh = new GBrainMemory(loadToken());
    try {
      const reread = await fresh.get(entry.key);
      if (reread.lifecycle !== "resolved")
        throw new Error("Fresh-client verification failed");
      console.log(
        JSON.stringify(
          {
            verified: true,
            created: created.providerId,
            updated: updated.providerId,
            freshRead: reread.providerId,
            namespace,
          },
          null,
          2,
        ),
      );
    } finally {
      await fresh.close();
    }
  } else throw new Error("Use inspect or verify.");
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "GBrain verification failed",
  );
  process.exitCode = 1;
} finally {
  await memory.close().catch(() => {});
}
