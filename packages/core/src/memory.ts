import { randomUUID } from "node:crypto";
import type { StateStore } from "./state";
import { GBrainMemory } from "../../gbrain-health-memory/src/index";

export function createMemory(store: StateStore, runId: string, token?: string) {
  return new GBrainMemory(token, async (event) => {
    await store.transaction((s) => {
      s.access.push({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        actor: `GBrain · ${event.tool}`,
        actorType: "memory",
        purpose: "Read or synchronize derived patient memory",
        resourceClasses: ["Derived memory"],
        mode: event.mode,
        result: event.result,
        runId,
        detail: `${event.durationMs} ms`,
      });
    });
  });
}
