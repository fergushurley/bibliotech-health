import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { seedResources, followupReport } from "../packages/demo-data/src/index";
import {
  evidenceFor,
  normalizeRecords,
  normalizePatient,
  validateResource,
} from "../packages/fhir/src/index";
import {
  candidateFindings,
  detectFollowUp,
  reviewFindings,
  validMemory,
} from "../packages/core/src/analysis";
import { authorizeAccess } from "../packages/core/src/access-policy";
import { JsonStore } from "../packages/core/src/store";
import { HealthWorkflow } from "../packages/core/src/workflow";
import {
  decodeMemory,
  encodeMemory,
  GBrainMemory,
  MemoryNotFound,
} from "../packages/gbrain-health-memory/src/index";
import type { HealthMemory, MemoryEntry } from "../packages/core/src/index";

// Explicit test double: never imported by the application or demo CLI.
class TestMemory implements HealthMemory {
  entries = new Map<string, MemoryEntry>();
  reads = 0;
  failWrite = false;
  failRead = false;
  async search(namespace: string) {
    this.reads++;
    if (this.failRead) throw new Error("Test provider unavailable");
    return [...this.entries.values()]
      .filter((m) => m.namespace === namespace)
      .map((m) => ({ ...m, recalledAt: new Date().toISOString() }));
  }
  async get(id: string) {
    const entry = this.entries.get(id);
    if (!entry) throw new MemoryNotFound("Missing test note");
    return structuredClone(entry);
  }
  async remember(entry: MemoryEntry) {
    if (this.failWrite) throw new Error("Test write denied");
    const stored = {
      ...structuredClone(entry),
      providerId: entry.key,
      recalledAt: new Date().toISOString(),
    };
    this.entries.set(entry.key, stored);
    return stored;
  }
  async resolve(entry: MemoryEntry) {
    return this.remember(entry);
  }
}
const directories: string[] = [];
async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "bibliotech-test-"));
  directories.push(dir);
  const store = new JsonStore(path.join(dir, "state.json"));
  const memory = new TestMemory();
  const workflow = new HealthWorkflow({ store, memory: () => memory });
  return { store, memory, workflow };
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
describe("FHIR and evidence", () => {
  it("normalizes every supported seeded type into a dated, source-addressable history", () => {
    const resources = seedResources();
    const events = normalizeRecords(resources);
    expect(resources).toHaveLength(27);
    expect(events).toHaveLength(26);
    expect(new Set(resources.map((r) => r.resourceType)).size).toBe(9);
    expect(events.every((e) => e.date && e.resourceId)).toBe(true);
    expect(normalizePatient(resources[0]).name).toBe("Jordan Taylor");
    expect(events[0].date > events.at(-1)!.date).toBe(true);
  });
  it("rejects malformed resources and missing dates", () => {
    expect(() =>
      validateResource({ resourceType: "Unsupported", id: "x" }),
    ).toThrow();
    expect(() =>
      normalizeRecords([{ resourceType: "Observation", id: "undated" }]),
    ).toThrow("date");
  });
  it("produces three source-backed candidates without cardiovascular diagnosis", () => {
    const resources = seedResources();
    const candidates = candidateFindings(resources, "2026-09-19T12:00:00Z");
    const review = reviewFindings(candidates, evidenceFor(resources));
    expect(review.supported).toHaveLength(3);
    expect(review.rejected).toHaveLength(0);
    expect(candidates[0].statement).toContain("No matching follow-up report");
    expect(candidates[1].statement).toContain("114 to 156 mg/dL");
    expect(candidates[2].status).toBe("inferred");
    expect(candidates[2].evidenceIds).toContain(
      "Observation/breast-arterial-calcification-2025",
    );
    expect(candidates[2].evidenceIds).not.toContain(
      "DiagnosticReport/mammogram-2026-03",
    );
  });
  it("rejects empty, fabricated, and overstated evidence claims", () => {
    const resources = seedResources();
    const base = candidateFindings(resources, "now")[0];
    const result = reviewFindings(
      [
        { ...base, evidenceIds: [] as any },
        { ...base, evidenceIds: ["Observation/fabricated"] },
        { ...base, statement: "You have cardiovascular disease." },
        { ...base, uncertainty: "" },
      ],
      evidenceFor(resources),
    );
    expect(result.supported).toHaveLength(0);
    expect(result.rejected).toHaveLength(4);
  });
  it("does not compare measurements across different units", () => {
    const resources = seedResources();
    for (const r of resources)
      if (r.id.startsWith("ldl-") && r.valueQuantity?.value !== 114)
        r.valueQuantity.unit = "mmol/L";
    expect(
      candidateFindings(resources, "now").some(
        (f) => f.id === "longitudinal-measurements",
      ),
    ).toBe(false);
  });
  it("requires the same patient, explicit order link, final status and appropriate date", () => {
    const base = seedResources();
    expect(detectFollowUp(base).lifecycle).toBe("open");
    for (const bad of [
      { ...followupReport, basedOn: [] },
      { ...followupReport, status: "preliminary" },
      { ...followupReport, subject: { reference: "Patient/someone-else" } },
      { ...followupReport, effectiveDateTime: "2022-01-01" },
    ])
      expect(detectFollowUp([...base, bad]).lifecycle).toBe("open");
    const resolved = detectFollowUp([...base, followupReport]);
    expect(resolved.lifecycle).toBe("resolved");
    expect(resolved.resolvedBy).toBe(
      "DiagnosticReport/followup-mammogram-2026-09",
    );
  });
});
describe("durable workflow", () => {
  it("completes the correction loop twice with a new remote read after each fresh session", async () => {
    const { workflow, store, memory } = await setup();
    for (let i = 0; i < 2; i++) {
      if (i) await workflow.resetDemo();
      const initial = await workflow.prepareVisit();
      expect(initial.findings).toHaveLength(3);
      expect(initial.memoryStatus).toBe("connected");
      await workflow.importFollowUp();
      const beforeReads = memory.reads;
      const before = await store.read();
      await workflow.freshSession();
      const cleared = await store.read();
      expect(cleared.brief).toBeUndefined();
      expect(cleared.memory).toHaveLength(3);
      expect(memory.reads).toBeGreaterThan(beforeReads);
      expect(cleared.namespace).toBe(before.namespace);
      expect(cleared.sessionId).not.toBe(before.sessionId);
      const next = await workflow.prepareVisit();
      expect(memory.reads).toBeGreaterThan(beforeReads);
      expect(next.findings).toHaveLength(2);
      expect(next.findings.some((f) => f.id === "breast-followup")).toBe(false);
      expect(
        next.memoryUsed.some((m) => m.lifecycle === "resolved" && m.providerId),
      ).toBe(true);
    }
  });
  it("memory changes the brief while canonical FHIR stays unchanged", async () => {
    const { workflow, store } = await setup();
    await workflow.prepareVisit();
    const before = JSON.stringify((await store.read()).resources);
    await workflow.markReviewed("longitudinal-measurements");
    await workflow.freshSession();
    const brief = await workflow.prepareVisit();
    expect(JSON.stringify((await store.read()).resources)).toBe(before);
    expect(brief.previouslyReviewed).toContain("Bring the longer view");
    expect(
      brief.findings.some((f) => f.id === "longitudinal-measurements"),
    ).toBe(false);
  });
  it("imports idempotently and separates resolved source state from pending remote state", async () => {
    const { workflow, store, memory } = await setup();
    await workflow.prepareVisit();
    memory.failWrite = true;
    expect((await workflow.importFollowUp()).synced).toBe(false);
    await workflow.importFollowUp();
    let state = await store.read();
    expect(state.resources).toHaveLength(28);
    expect(state.pendingMemory).toHaveLength(1);
    expect(state.pendingMemory[0].lifecycle).toBe("resolved");
    expect(
      state.memory.find((m) => m.key.endsWith("/breast-followup"))?.lifecycle,
    ).toBe("open");
    memory.failWrite = false;
    expect((await workflow.retryMemory()).synced).toBe(true);
    state = await store.read();
    expect(state.pendingMemory).toHaveLength(0);
    expect(
      state.memory.find((m) => m.key.endsWith("/breast-followup"))?.lifecycle,
    ).toBe("resolved");
  });
  it("shows an honest local brief when memory is unavailable", async () => {
    const { workflow, memory, store } = await setup();
    memory.failRead = true;
    const brief = await workflow.prepareVisit();
    expect(brief.findings).toHaveLength(3);
    expect(brief.memoryStatus).toBe("unavailable");
    expect((await store.read()).memory).toHaveLength(0);
    expect((await store.read()).pendingMemory).toHaveLength(3);
  });
  it("reset changes namespace and retains external notes", async () => {
    const { workflow, store, memory } = await setup();
    await workflow.prepareVisit();
    const before = await store.read();
    await workflow.resetDemo();
    const after = await store.read();
    expect(after.namespace).not.toBe(before.namespace);
    expect(memory.entries.size).toBe(3);
    expect(await memory.search(after.namespace)).toHaveLength(0);
  });
  it("rejects stale namespace or unresolvable memory references", async () => {
    const { workflow, store, memory } = await setup();
    await workflow.prepareVisit();
    const state = await store.read();
    const entry = [...memory.entries.values()][0];
    expect(
      validMemory(
        [
          { ...entry, namespace: "different" },
          { ...entry, evidenceIds: ["missing"] },
        ],
        state.namespace,
        state.resources,
      ),
    ).toHaveLength(0);
  });
  it("serializes concurrent store updates without losing records", async () => {
    const { store } = await setup();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.transaction((s) => {
          s.access.push(
            authorizeAccess("Research Agent", ["Full record"], String(i)),
          );
        }),
      ),
    );
    expect((await store.read()).access).toHaveLength(20);
  });
});
describe("provider boundary and access", () => {
  it("fails explicitly without a token rather than mocking GBrain", async () => {
    const memory = new GBrainMemory(undefined);
    await expect(memory.search("demo")).rejects.toThrow("not connected");
  });
  it("round-trips human-readable provenance without embedding raw records", () => {
    const entry: MemoryEntry = {
      key: "bibliotech/test/finding",
      namespace: "test",
      patientId: "jordan-taylor-synthetic",
      title: "A note",
      statement: "A source-linked question.",
      evidenceIds: ["DiagnosticReport/example"],
      status: "unresolved",
      lifecycle: "open",
      updatedAt: "2026-09-19T12:00:00Z",
      sourceDates: ["2026-03-12"],
    };
    const markdown = encodeMemory(entry);
    expect(markdown).toContain("Evidence: DiagnosticReport/example");
    expect(decodeMemory(markdown, "remote-id")).toMatchObject({
      ...entry,
      providerId: "remote-id",
    });
    expect(() => decodeMemory("unstructured provider prose", "x")).toThrow();
  });
  it("denies full-record research access in code", () => {
    expect(
      authorizeAccess("Research Agent", ["Full record"], "test").result,
    ).toBe("denied");
    expect(
      authorizeAccess(
        "Follow-up Agent",
        ["DiagnosticReport", "ServiceRequest"],
        "test",
      ).result,
    ).toBe("allowed");
    expect(
      authorizeAccess("Follow-up Agent", ["MedicationRequest"], "test").result,
    ).toBe("denied");
  });
});
