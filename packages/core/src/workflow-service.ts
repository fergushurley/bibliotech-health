import { randomUUID } from "node:crypto";
import type {
  AgentRun,
  AppState,
  Finding,
  HealthMemory,
  MemoryEntry,
  VisitBrief,
} from "./index";
import { initialState, type StateStore } from "./state";
import {
  candidateFindings,
  detectFollowUp,
  prioritizeFindings,
  reviewFindings,
  validMemory,
} from "./analysis";
import { authorizeAccess } from "./access-policy";
import {
  evidenceFor,
  normalizeRecords,
  resourceId,
} from "../../fhir/src/index";
import { followupReport, PATIENT_ID } from "../../demo-data/src/index";
export const safeError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The operation could not be completed.";
type Dependencies = {
  store: StateStore;
  memory: (runId: string) => HealthMemory;
  allowReset?: boolean;
};
export class HealthWorkflow {
  readonly store: StateStore;
  private memory: (runId: string) => HealthMemory;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private deps: Dependencies) {
    this.store = deps.store;
    this.memory = deps.memory;
  }
  private exclusive<T>(fn: () => Promise<T>) {
    const task = this.queue.then(fn);
    this.queue = task.catch(() => {});
    return task;
  }
  private entry(
    state: AppState,
    f: Finding,
    lifecycle: MemoryEntry["lifecycle"] = "open",
  ): MemoryEntry {
    const evidence = evidenceFor(state.resources);
    return {
      key: `bibliotech/${state.namespace}/${f.id}`,
      namespace: state.namespace,
      patientId: PATIENT_ID,
      title: f.title,
      statement: f.statement,
      evidenceIds: f.evidenceIds,
      status: f.status,
      lifecycle,
      updatedAt: new Date().toISOString(),
      sourceDates: f.evidenceIds.map(
        (id) => evidence.find((e) => e.id === id)!.date,
      ),
    };
  }
  private resolution(state: AppState): MemoryEntry {
    const followup = detectFollowUp(state.resources);
    if (!followup.resolvedBy)
      throw new Error("Cannot resolve without a matching source report.");
    const evidence = evidenceFor(state.resources);
    const evidenceIds = [
      followup.sourceId,
      followup.orderId,
      followup.resolvedBy,
    ];
    return {
      key: `bibliotech/${state.namespace}/breast-followup`,
      namespace: state.namespace,
      patientId: PATIENT_ID,
      title: "Follow-up documentation received",
      statement:
        "The imported September 18 report explicitly links to the six-month imaging order. The earlier question about missing follow-up documentation is resolved in this record set.",
      evidenceIds,
      status: "verified",
      lifecycle: "resolved",
      updatedAt: new Date().toISOString(),
      sourceDates: evidenceIds.map(
        (id) => evidence.find((e) => e.id === id)!.date,
      ),
    };
  }
  prepareVisit() {
    return this.exclusive(() => this.prepare());
  }
  private async prepare(): Promise<VisitBrief> {
    const snapshot = await this.store.read();
    const id = randomUUID();
    const now = new Date().toISOString();
    const run: AgentRun = {
      id,
      sessionId: snapshot.sessionId,
      startedAt: now,
      status: "running",
      stages: [],
      candidateCount: 0,
      supportedCount: 0,
      rejected: [],
      memoryStatus: "unavailable",
    };
    await this.store.transaction((s) => {
      s.runs.push(run);
      s.runs = s.runs.slice(-20);
    });
    const stage = async (
      name: string,
      detail: string,
      status: "running" | "complete" | "failed" = "complete",
    ) => {
      await this.store.transaction((s) => {
        const r = s.runs.find((r) => r.id === id)!;
        const old = r.stages.find((x) => x.name === name);
        if (old)
          Object.assign(old, { detail, status, at: new Date().toISOString() });
        else
          r.stages.push({ name, detail, status, at: new Date().toISOString() });
      });
    };
    const access = async (actor: string, classes: string[]) => {
      const event = authorizeAccess(actor, classes, id);
      await this.store.transaction((s) => s.access.push(event));
      if (event.result === "denied")
        throw new Error("Access denied by deterministic policy.");
      return snapshot.resources.filter((r) => classes.includes(r.resourceType));
    };
    const memory = this.memory(id);
    let recalled: MemoryEntry[] = [];
    let memoryMessage: string | undefined;
    let connected = false;
    try {
      const resources = await access("Timeline Agent", [
        ...new Set(snapshot.resources.map((r) => r.resourceType)),
      ]);
      await stage(
        "Timeline Agent",
        `Organized ${normalizeRecords(resources).length} longitudinal events.`,
      );
      await stage(
        "GBrain recall",
        "Searching the current demo namespace.",
        "running",
      );
      try {
        recalled = validMemory(
          await memory.search(snapshot.namespace),
          snapshot.namespace,
          resources,
        );
        connected = true;
        await stage(
          "GBrain recall",
          `Read ${recalled.length} source-linked notes from GBrain.`,
        );
      } catch (error) {
        memoryMessage = safeError(error);
        await stage("GBrain recall", memoryMessage, "failed");
      }
      const followUp = detectFollowUp(
        await access("Follow-up Agent", ["DiagnosticReport", "ServiceRequest"]),
      );
      await stage(
        "Follow-up Agent",
        followUp.lifecycle === "open"
          ? "No matching final report found for the imaging order."
          : "The imported report explicitly fulfills the imaging order.",
      );
      const meds = await access("Medication Agent", ["MedicationRequest"]);
      await stage(
        "Medication Agent",
        `Compared ${meds.length} prescription records; no treatment recommendation generated.`,
      );
      await access("Cross-Specialty Agent", [
        "Observation",
        "DiagnosticReport",
      ]);
      await stage(
        "Cross-Specialty Agent",
        "Compared recorded measurements and the imaging report’s discussion recommendation.",
      );
      const evidence = evidenceFor(
        await access("Reviewer Agent", [
          ...new Set(resources.map((r) => r.resourceType)),
        ]),
      );
      const candidates = candidateFindings(resources, now);
      const reviewed = reviewFindings(candidates, evidence);
      const prioritized = prioritizeFindings(reviewed.supported, recalled);
      await stage(
        "Reviewer Agent",
        `${candidates.length} candidates → ${reviewed.supported.length} evidence-supported findings.`,
      );
      const entries = reviewed.supported
        .filter(
          (f) =>
            !recalled.some(
              (m) =>
                m.key.endsWith(`/${f.id}`) &&
                m.evidenceIds.join("|") === f.evidenceIds.join("|"),
            ),
        )
        .map((f) => this.entry(snapshot, f));
      if (
        followUp.lifecycle === "resolved" &&
        !recalled.some(
          (m) =>
            m.key.endsWith("/breast-followup") && m.lifecycle === "resolved",
        )
      )
        entries.push(this.resolution(snapshot));
      const merged = new Map(entries.map((e) => [e.key, e]));
      for (const e of validMemory(
        snapshot.pendingMemory,
        snapshot.namespace,
        resources,
      )) {
        if (
          e.lifecycle === "reviewed" &&
          reviewed.supported.some((f) => e.key.endsWith(`/${f.id}`))
        )
          merged.set(e.key, e);
      }
      const saved = [...recalled];
      const pending: MemoryEntry[] = [];
      await stage(
        "GBrain sync",
        "Saving only reviewed, source-linked conclusions.",
        "running",
      );
      for (const entry of merged.values()) {
        if (!connected) {
          pending.push(entry);
          continue;
        }
        try {
          const stored = await memory.remember(entry);
          const index = saved.findIndex((m) => m.key === stored.key);
          if (index >= 0) saved[index] = stored;
          else saved.push(stored);
        } catch (error) {
          pending.push(entry);
          memoryMessage = safeError(error);
        }
      }
      const memoryStatus = !connected
        ? "unavailable"
        : pending.length
          ? "pending"
          : "connected";
      await stage(
        "GBrain sync",
        memoryStatus === "connected"
          ? `${saved.length} notes verified in GBrain.`
          : (memoryMessage ?? "Memory update pending."),
        memoryStatus === "connected" ? "complete" : "failed",
      );
      const brief: VisitBrief = {
        id: randomUUID(),
        runId: id,
        generatedAt: now,
        findings: prioritized.findings,
        questions: prioritized.findings.map((f) => ({
          text: f.question,
          evidenceIds: f.evidenceIds,
        })),
        sourceCount: new Set(prioritized.findings.flatMap((f) => f.evidenceIds))
          .size,
        followUp,
        memoryUsed: recalled,
        memoryStatus,
        memoryMessage,
        previouslyReviewed: prioritized.previouslyReviewed,
      };
      await this.store.transaction((s) => {
        s.brief = brief;
        s.memory = saved;
        s.pendingMemory = pending;
        s.lastMemoryError = memoryMessage;
        const r = s.runs.find((r) => r.id === id)!;
        Object.assign(r, {
          status: "complete",
          completedAt: new Date().toISOString(),
          candidateCount: candidates.length,
          supportedCount: reviewed.supported.length,
          rejected: reviewed.rejected,
          memoryStatus,
          error: memoryMessage,
        });
        s.access = s.access.slice(-300);
      });
      return brief;
    } catch (error) {
      await this.store.transaction((s) => {
        const r = s.runs.find((r) => r.id === id)!;
        r.status = "failed";
        r.error = safeError(error);
        r.completedAt = new Date().toISOString();
      });
      throw error;
    } finally {
      await memory.close?.().catch(() => {});
    }
  }
  importFollowUp() {
    return this.exclusive(async () => {
      const snapshot = await this.store.transaction((s) => {
        if (
          !s.resources.some((r) => resourceId(r) === resourceId(followupReport))
        )
          s.resources.push(structuredClone(followupReport));
        s.imported = true;
        s.brief = undefined;
        return structuredClone(s);
      });
      const entry = this.resolution(snapshot);
      await this.store.transaction((s) => {
        s.pendingMemory = [
          ...s.pendingMemory.filter((m) => m.key !== entry.key),
          entry,
        ];
      });
      return this.sync();
    });
  }
  retryMemory() {
    return this.exclusive(() => this.sync());
  }
  private async sync() {
    const state = await this.store.read();
    if (!state.pendingMemory.length)
      return {
        synced: false,
        pending: 0,
        error: "There are no pending updates to verify.",
      };
    const memory = this.memory(`sync-${randomUUID()}`);
    const pending: MemoryEntry[] = [];
    const saved: MemoryEntry[] = [];
    let error: string | undefined;
    try {
      for (const entry of state.pendingMemory) {
        try {
          saved.push(
            await (entry.lifecycle === "resolved"
              ? memory.resolve(entry)
              : memory.remember(entry)),
          );
        } catch (e) {
          pending.push(entry);
          error = safeError(e);
        }
      }
    } finally {
      await memory.close?.().catch(() => {});
    }
    await this.store.transaction((s) => {
      for (const entry of saved)
        s.memory = [...s.memory.filter((m) => m.key !== entry.key), entry];
      s.pendingMemory = pending;
      s.lastMemoryError = error;
      if (s.brief) {
        s.brief.memoryStatus = pending.length ? "pending" : "connected";
        s.brief.memoryMessage = error;
      }
    });
    return { synced: pending.length === 0, pending: pending.length, error };
  }
  recallMemory() {
    return this.exclusive(async () => {
      const state = await this.store.read();
      const memory = this.memory(`recall-${randomUUID()}`);
      try {
        const entries = validMemory(
          await memory.search(state.namespace),
          state.namespace,
          state.resources,
        );
        await this.store.transaction((s) => {
          s.memory = entries;
          s.lastMemoryError = undefined;
        });
        return entries;
      } catch (error) {
        await this.store.transaction((s) => {
          s.memory = [];
          s.lastMemoryError = safeError(error);
        });
        throw error;
      } finally {
        await memory.close?.().catch(() => {});
      }
    });
  }
  markReviewed(findingId: string) {
    return this.exclusive(async () => {
      const state = await this.store.read();
      const finding = state.brief?.findings.find((f) => f.id === findingId);
      if (!finding)
        throw new Error("Prepare a brief before marking a finding reviewed.");
      const entry = this.entry(state, finding, "reviewed");
      await this.store.transaction((s) => {
        s.pendingMemory = [
          ...s.pendingMemory.filter((m) => m.key !== entry.key),
          entry,
        ];
      });
      return this.sync();
    });
  }
  freshSession() {
    return this.exclusive(async () => {
      await this.store.transaction((s) => {
        s.sessionId = randomUUID();
        s.brief = undefined;
        s.memory = [];
        s.lastMemoryError = undefined;
      });
      const state = await this.store.read();
      const memory = this.memory(`fresh-${randomUUID()}`);
      try {
        const entries = validMemory(
          await memory.search(state.namespace),
          state.namespace,
          state.resources,
        );
        await this.store.transaction((s) => {
          s.memory = entries;
        });
        return {
          message: `Fresh session read ${entries.length} notes from GBrain. Prepare a brief to use them.`,
        };
      } catch (error) {
        await this.store.transaction((s) => {
          s.lastMemoryError = safeError(error);
        });
        return {
          message:
            "Fresh session started. GBrain recall is unavailable; memory remains unverified.",
        };
      } finally {
        await memory.close?.().catch(() => {});
      }
    });
  }
  resetDemo() {
    return this.exclusive(async () => {
      if (!this.deps.allowReset)
        throw new Error("Reset Demo is available in development only.");
      await this.store.transaction((s) =>
        Object.assign(s, initialState(), {
          brief: undefined,
          lastMemoryError: undefined,
        }),
      );
      return {
        message:
          "Initial priors restored in a new namespace. Existing GBrain notes retained.",
      };
    });
  }
  denyResearch() {
    return this.exclusive(async () => {
      const event = authorizeAccess(
        "Research Agent",
        ["Full record"],
        `policy-${randomUUID()}`,
      );
      await this.store.transaction((s) => s.access.push(event));
      return event;
    });
  }
}
