import { loadEnvFile } from "node:process";
import path from "node:path";
import { store, projectRoot } from "./store";
import type { StateStore } from "./state";
import type { HealthMemory } from "./index";
import { HealthWorkflow as WorkflowService } from "./workflow-service";
import { createMemory } from "./memory";
export { safeError } from "./workflow-service";

export function loadToken() {
  if (!process.env.GBRAIN_TOKEN && process.env.NODE_ENV !== "production") {
    try {
      loadEnvFile(path.join(projectRoot(), ".env.local"));
    } catch {
      /* A missing connection is shown explicitly in the UI. */
    }
  }
  return process.env.GBRAIN_TOKEN;
}

export function memoryFactory(store: StateStore, runId: string): HealthMemory {
  return createMemory(store, runId, loadToken());
}

export class HealthWorkflow extends WorkflowService {
  constructor(
    deps: {
      store?: StateStore;
      memory?: (runId: string) => HealthMemory;
    } = {},
  ) {
    const selectedStore = deps.store ?? store;
    super({
      store: selectedStore,
      memory: deps.memory ?? ((id) => memoryFactory(selectedStore, id)),
      allowReset: process.env.NODE_ENV !== "production",
    });
  }
}

const globalWorkflow = globalThis as typeof globalThis & {
  bibliotechWorkflow?: HealthWorkflow;
};
export const workflow = (globalWorkflow.bibliotechWorkflow ??=
  new HealthWorkflow());
