import { initialRecords } from "./data";
import type { DemoState } from "./types";
export function initialState(): DemoState {
  return {
    records: structuredClone(initialRecords),
    run: null,
    ledger: [],
    memory: [],
    connection: {
      connected: false,
      message: "GBrain isn't connected. Persistent memory is unavailable.",
      checkedAt: new Date().toISOString(),
    },
  };
}
