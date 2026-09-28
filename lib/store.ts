import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { initialState } from "./initial-state";
export { initialState } from "./initial-state";
import type { DemoState } from "./types";
const globalStore = globalThis as typeof globalThis & {
  bibliotechQueue?: Promise<unknown>;
};
export const stateDirectory = () =>
  process.env.BIBLIOTECH_DATA_DIR || path.join(process.cwd(), ".data");
export async function loadState(): Promise<DemoState> {
  try {
    return JSON.parse(
      await readFile(path.join(stateDirectory(), "demo.json"), "utf8"),
    ) as DemoState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return initialState();
    throw new Error(
      "The local demo record could not be read. Restore .data/demo.json or reset the demo data file.",
    );
  }
}
export async function saveState(state: DemoState) {
  await mkdir(stateDirectory(), { recursive: true });
  const file = path.join(stateDirectory(), "demo.json");
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(temp, file);
}
export async function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = (globalStore.bibliotechQueue ?? Promise.resolve()).then(
    work,
    work,
  );
  globalStore.bibliotechQueue = next.catch(() => {});
  return next;
}
