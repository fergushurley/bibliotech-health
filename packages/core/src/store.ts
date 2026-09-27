import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedResources } from "../../demo-data/src/index";
import type { AppState } from "./index";
export function projectRoot() {
  return process.cwd().endsWith(path.join("apps", "web"))
    ? path.resolve(process.cwd(), "../..")
    : process.cwd();
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
export class JsonStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    readonly file = path.join(projectRoot(), ".data", "state.json"),
  ) {}
  private async load(): Promise<AppState> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return initialState();
    }
  }
  transaction<T>(change: (state: AppState) => T | Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      const state = await this.load();
      const result = await change(state);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.${randomUUID()}.tmp`;
      await fs.writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
      await fs.rename(temp, this.file);
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  read() {
    return this.transaction((s) => structuredClone(s));
  }
}
const globalStore = globalThis as typeof globalThis & {
  bibliotechStore?: JsonStore;
};
export const store = (globalStore.bibliotechStore ??= new JsonStore());
