import { initialState } from "../lib/initial-state";
import type { DemoState } from "../lib/types";
import type { WorkflowStore } from "../lib/workflow-service";

export interface StorageBackend {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export class SessionStore implements WorkflowStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: StorageBackend) {}
  initialState = (): DemoState => ({ ...initialState(), publicDemo: true });
  loadState = async (): Promise<DemoState> =>
    (await this.storage.get<DemoState>("state")) ?? this.initialState();
  saveState = async (state: DemoState) => {
    state.publicDemo = true;
    state.ledger = state.ledger.slice(-100);
    await this.storage.put("state", state);
  };
  exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const task = this.queue.then(work, work);
    this.queue = task.catch(() => {});
    return task;
  };
}
