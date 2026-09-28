import type { MemoryAdapter } from "../lib/workflow-service";

// Public visitors have isolated demo state and no shared remote memory account.
export const publicMemory: MemoryAdapter = {
  async readMemory() {
    return {
      connection: {
        connected: false,
        message: "GBrain is not connected to this public demo. Your demo records are stored in an isolated session for 24 hours.",
        checkedAt: new Date().toISOString(),
      },
      memory: [],
      importedFollowup: false,
    };
  },
  async writeMemory() { throw new Error("GBrain is not connected to this public demo."); },
  async resetRemoteMemory() { throw new Error("Remote memory reset is unavailable in the public demo."); },
};
