import * as store from "./store";
import * as memory from "./gbrain";
import { createWorkflow } from "./workflow-service";
export type { Progress } from "./workflow-service";
export const {
  getState, prepareBrief, importFollowup, freshSession,
  resetDemo, syncMemory, requestOutsideRun,
} = createWorkflow(store, memory);
