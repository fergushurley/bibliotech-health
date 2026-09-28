import type { AppState } from "../../../packages/core/src/index";
import {
  initialState,
  type StateStore,
} from "../../../packages/core/src/state";

export interface StorageBackend {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

export class SessionStore implements StateStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: StorageBackend) {}

  transaction<T>(change: (state: AppState) => T | Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      const state =
        (await this.storage.get<AppState>("state")) ?? initialState();
      const result = await change(state);
      // Keep the SQLite KV value below its size limit as visitors repeat the demo.
      state.access = state.access.slice(-100);
      state.runs = state.runs.slice(-10);
      await this.storage.put("state", state);
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }

  async read(): Promise<AppState> {
    await this.queue;
    const state = await this.storage.get<AppState>("state");
    return state ?? this.transaction((s) => structuredClone(s));
  }
}
