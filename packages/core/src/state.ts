import { randomUUID } from "node:crypto";
import { seedResources } from "../../demo-data/src/index";
import type { AppState } from "./index";

export interface StateStore {
  transaction<T>(change: (state: AppState) => T | Promise<T>): Promise<T>;
  read(): Promise<AppState>;
}

export function initialState(): AppState {
  return {
    version: 1,
    namespace: `bibliotech-${randomUUID()}`,
    sessionId: randomUUID(),
    resources: seedResources(),
    runs: [],
    access: [],
    memory: [],
    pendingMemory: [],
    imported: false,
  };
}
