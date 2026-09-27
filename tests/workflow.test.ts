import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { HealthMemoryEntry } from "../lib/types";
const remote = vi.hoisted(() => ({
  connected: false,
  entries: [] as HealthMemoryEntry[],
  imported: false,
  writes: 0,
}));
// Isolated test double only. The application never ships a mock memory mode.
vi.mock("../lib/gbrain", () => ({
  readMemory: async () => ({
    connection: {
      connected: remote.connected,
      message: remote.connected
        ? "Test transport connected"
        : "Test transport disconnected",
      checkedAt: new Date().toISOString(),
    },
    memory: remote.connected ? structuredClone(remote.entries) : [],
    importedFollowup: remote.connected && remote.imported,
  }),
  writeMemory: async (entries: HealthMemoryEntry[], imported: boolean) => {
    remote.entries = structuredClone(entries);
    remote.imported = imported;
    remote.writes++;
    return entries;
  },
  resetRemoteMemory: async () => {
    remote.entries = [];
    remote.imported = false;
  },
}));
import {
  freshSession,
  getState,
  importFollowup,
  prepareBrief,
  resetDemo,
} from "../lib/workflow";
import { followupRecord } from "../lib/data";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "bibliotech-test-"));
  process.env.BIBLIOTECH_DATA_DIR = directory;
  remote.connected = false;
  remote.entries = [];
  remote.imported = false;
  remote.writes = 0;
});
afterEach(async () => {
  delete process.env.BIBLIOTECH_DATA_DIR;
  await rm(directory, { recursive: true, force: true });
});
describe("reliable demo lifecycle", () => {
  it("executes a real run, links evidence and emits a denied ledger event", async () => {
    const progress: string[] = [];
    const state = await prepareBrief((e) => progress.push(e.label));
    expect(state.run?.status).toBe("complete");
    expect(state.run?.findings).toHaveLength(3);
    expect(state.run?.reviewedIds).toHaveLength(17);
    expect(
      state.run?.steps.every(
        (s) => s.status === "complete" && s.startedAt && s.completedAt,
      ),
    ).toBe(true);
    expect(state.ledger).toHaveLength(6);
    expect(state.ledger.at(-1)?.result).toBe("Denied");
    expect(state.ledger.at(-1)?.recordIds).toEqual([]);
    expect(progress.length).toBeGreaterThan(5);
    expect(state.memory).toEqual([]);
  });
  it("imports once, invalidates the old brief, and survives a fresh local session honestly", async () => {
    await prepareBrief(() => {});
    const imported = await importFollowup(followupRecord.resource, () => {});
    expect(imported.run).toBe(null);
    expect(imported.connection.connected).toBe(false);
    expect(imported.importMessage).toContain("has not been updated");
    await importFollowup(followupRecord.resource, () => {});
    expect((await getState()).records).toHaveLength(26);
    await freshSession();
    const result = await prepareBrief(() => {});
    expect(result.run?.findings.map((f) => f.id)).not.toContain("follow-up");
    expect(result.run?.findings).toHaveLength(2);
    expect(result.memory).toEqual([]);
  });
  it("recalls resolved remote memory even after all local demo data is reset", async () => {
    remote.connected = true;
    await prepareBrief(() => {});
    expect(remote.entries).toHaveLength(3);
    await importFollowup(followupRecord.resource, () => {});
    expect(
      remote.entries.find((e) => e.id === "BT-MEM-follow-up")?.status,
    ).toBe("resolved");
    await resetDemo(false);
    expect(remote.entries).toHaveLength(3);
    const fresh = await freshSession();
    expect(fresh.records.some((r) => r.id === followupRecord.id)).toBe(true);
    const second = await prepareBrief(() => {});
    expect(second.run?.findings.map((f) => f.id)).not.toContain("follow-up");
    expect(remote.writes).toBeGreaterThanOrEqual(3);
  });
  it("only clears remote demo memory after explicit reset selection", async () => {
    remote.connected = true;
    await prepareBrief(() => {});
    await resetDemo(false);
    expect(remote.entries).toHaveLength(3);
    await resetDemo(true);
    expect(remote.entries).toEqual([]);
  });
  it("refuses non-demo FHIR imports without changing state", async () => {
    await expect(
      importFollowup({ ...followupRecord.resource, id: "different" }, () => {}),
    ).rejects.toThrow("supplied synthetic");
    expect((await getState()).records).toHaveLength(25);
  });
  it("serializes concurrent imports without duplicates", async () => {
    await Promise.all([
      importFollowup(followupRecord.resource, () => {}),
      importFollowup(followupRecord.resource, () => {}),
    ]);
    expect((await getState()).records).toHaveLength(26);
  });
});
