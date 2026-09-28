import { followupRecord, relevantIds } from "./data";
import {
  absenceCandidate,
  authorize,
  buildMemory,
  crossSpecialtyFindings,
  followupFindings,
  medicationFindings,
  reviewFinding,
} from "./domain";
import type { AgentStep, Connection, DemoState, Finding, HealthMemoryEntry, Scope } from "./types";
export type Progress = { label: string; state?: DemoState; done?: boolean };
export interface WorkflowStore {
  initialState(): DemoState;
  loadState(): Promise<DemoState>;
  saveState(state: DemoState): Promise<void>;
  exclusive<T>(work: () => Promise<T>): Promise<T>;
}
export interface MemoryAdapter {
  readMemory(): Promise<{ connection: Connection; memory: HealthMemoryEntry[]; importedFollowup: boolean }>;
  writeMemory(entries: HealthMemoryEntry[], imported: boolean): Promise<HealthMemoryEntry[]>;
  resetRemoteMemory(): Promise<void>;
}
export function createWorkflow(store: WorkflowStore, memory: MemoryAdapter) {
  const { initialState, loadState, saveState, exclusive } = store;
  const { readMemory, writeMemory, resetRemoteMemory } = memory;
  async function recallInto(state: DemoState) {
    const remote = await readMemory();
    state.connection = remote.connection;
    state.memory = remote.memory;
    if (
      remote.connection.connected &&
      remote.importedFollowup &&
      remote.memory.some(
        (m) =>
          m.status === "resolved" && m.resolvedByEvidenceId === followupRecord.id,
      ) &&
      !state.records.some((r) => r.id === followupRecord.id)
    )
      state.records.push(structuredClone(followupRecord));
    state.records.sort((a, b) => b.date.localeCompare(a.date));
  }
  async function persistMemory(state: DemoState, findings: Finding[]) {
    if (!state.connection.connected) return;
    try {
      state.memory = await writeMemory(
        buildMemory(findings, state.records, state.memory),
        state.records.some((r) => r.id === followupRecord.id),
      );
    } catch {
      state.memory = [];
      state.connection = {
        connected: false,
        message:
          "GBrain memory update could not be verified. Your imported record is saved locally. Check the connection and retry sync.",
        checkedAt: new Date().toISOString(),
      };
    }
  }
  async function getState(refresh = true) {
    return exclusive(async () => {
      const state = await loadState();
      if (refresh) {
        await recallInto(state);
        await saveState(state);
      }
      return state;
    });
  }
  async function prepareBrief(emit: (event: Progress) => void) {
    return exclusive(async () => {
      const state = await loadState();
      const startedAt = new Date().toISOString();
      emit({ label: `Loading ${state.records.length} priors` });
      await recallInto(state);
      emit({
        label: state.connection.connected
          ? "Recalled patient memory from GBrain"
          : "GBrain unavailable · proceeding with available records",
      });
      const steps: AgentStep[] = [
        {
          name: "Timeline Agent",
          status: "pending",
          activity: "Organize longitudinal evidence",
          scopes: ["Timeline"],
        },
        {
          name: "Follow-Up Agent",
          status: "pending",
          activity: "Match recommendations with subsequent records",
          scopes: ["Imaging", "Notes"],
        },
        {
          name: "Medication Agent",
          status: "pending",
          activity: "Check current medication evidence",
          scopes: ["Medications", "Notes"],
        },
        {
          name: "Cross-Specialty Agent",
          status: "pending",
          activity: "Connect imaging, lipid and blood-pressure evidence",
          scopes: ["Imaging", "Lipid Labs", "Blood Pressure"],
        },
        {
          name: "Reviewer Agent",
          status: "pending",
          activity: "Check evidence and preserve uncertainty",
          scopes: ["Candidate Findings", "Evidence"],
        },
      ];
      state.run = {
        id: `BT-${startedAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        status: "running",
        startedAt,
        reviewedIds: [],
        findings: [],
        rejected: [],
        steps,
      };
      const run = state.run;
      const candidates: Finding[] = [];
      const purposes = [
        "Prepare brief",
        "Check follow-ups",
        "Reconcile medications",
        "Find connections",
        "Verify findings",
      ];
      const relevant = state.records.filter(
        (r) => relevantIds.includes(r.id) || r.id === followupRecord.id,
      );
      try {
        for (const [index, step] of steps.entries()) {
          step.status = "running";
          step.startedAt = new Date().toISOString();
          await saveState(state);
          emit({ label: step.activity, state: structuredClone(state) });
          const access = authorize(
            step.name,
            step.scopes,
            purposes[index],
            run.id,
            run.status === "running" ? run.id : null,
            relevant,
          );
          state.ledger.push(access.event);
          if (access.event.result !== "Allowed")
            throw new Error(`Access denied for ${step.name}`);
          const records = access.records;
          if (index === 0) {
            run.reviewedIds = records.map((r) => r.id);
            step.activity = `Normalized ${records.length} relevant events across ${new Date().getFullYear() - 2018} years`;
          }
          if (index === 1) {
            const recommendations = records.filter((r) => r.recommendation);
            const matched = recommendations.filter((r) =>
              records.some(
                (f) => f.fulfills === r.recommendation!.key && f.date > r.date,
              ),
            );
            candidates.push(
              ...followupFindings(records),
              ...absenceCandidate(records),
            );
            step.activity = `Found ${recommendations.length} recommendations · ${matched.length} matching follow-up${matched.length === 1 ? "" : "s"} · ${recommendations.length - matched.length} unresolved`;
          }
          if (index === 2) {
            const findings = medicationFindings(records);
            candidates.push(...findings);
            step.activity = `Detected ${findings.length} dose discrepancy`;
          }
          if (index === 3) {
            const findings = crossSpecialtyFindings(records);
            candidates.push(...findings);
            step.activity = `Generated ${findings.length} candidate connections from imaging, 5 lipid results and 4 BP measurements`;
          }
          if (index === 4) {
            const reviewed = candidates.map((f) => reviewFinding(f, records));
            run.findings = reviewed
              .filter((f) => f.reviewer.passed)
              .sort(
                (a, b) =>
                  [
                    "follow-up",
                    "cross-specialty-cardiovascular",
                    "medication",
                  ].indexOf(a.id) -
                  [
                    "follow-up",
                    "cross-specialty-cardiovascular",
                    "medication",
                  ].indexOf(b.id),
              );
            run.rejected = reviewed.filter((f) => !f.reviewer.passed);
            step.activity = `Reviewed ${reviewed.length} candidates · ${run.findings.length} accepted · ${run.rejected.length} rejected`;
          }
          step.status = "complete";
          step.completedAt = new Date().toISOString();
          await saveState(state);
          emit({ label: step.activity, state: structuredClone(state) });
        }
        // Deliberate policy probe: the research request must return no records.
        state.ledger.push(
          authorize(
            "Research Agent",
            ["Full Record"],
            "External research",
            run.id,
            run.id,
            relevant,
          ).event,
        );
        emit({
          label: state.connection.connected
            ? "Updating GBrain memory"
            : "Persistent memory unavailable · preparing evidence-backed brief",
        });
        await persistMemory(state, run.findings);
        run.status = "complete";
        run.completedAt = new Date().toISOString();
        await saveState(state);
        emit({ label: "Your brief is ready", state, done: true });
        return state;
      } catch (error) {
        run.status = "failed";
        run.error =
          error instanceof Error ? error.message : "The workflow failed.";
        const active = steps.find((s) => s.status === "running");
        if (active) active.status = "failed";
        await saveState(state);
        throw error;
      }
    });
  }
  async function importFollowup(
    resource: unknown,
    emit: (event: Progress) => void,
  ) {
    return exclusive(async () => {
      // This demo accepts its known synthetic fixture only, never arbitrary patient data.
      if (JSON.stringify(resource) !== JSON.stringify(followupRecord.resource))
        throw new Error(
          "Select the supplied synthetic follow-up fixture. Other records are not accepted in this demo.",
        );
      const state = await loadState();
      emit({ label: "Importing synthetic record" });
      if (!state.records.some((r) => r.id === followupRecord.id))
        state.records.push(structuredClone(followupRecord));
      state.records.sort((a, b) => b.date.localeCompare(a.date));
      await saveState(state);
      emit({ label: "Matched the March 2024 recommendation" });
      await recallInto(state);
      const accepted = [
        ...medicationFindings(state.records),
        ...crossSpecialtyFindings(state.records),
      ]
        .map((f) => reviewFinding(f, state.records))
        .filter((f) => f.reviewer.passed);
      emit({ label: "Updated source evidence" });
      await persistMemory(state, accepted);
      // Invalidate the old brief immediately; a historical run must never be presented as current.
      state.run = null;
      state.importMessage = state.connection.connected
        ? "Follow-up resolved. GBrain memory updated and independently recalled."
        : "Follow-up matched in local records. GBrain memory has not been updated because the connection is unavailable.";
      await saveState(state);
      emit({ label: state.importMessage, state, done: true });
      return state;
    });
  }
  async function freshSession() {
    return exclusive(async () => {
      const state = await loadState();
      state.run = null;
      delete state.importMessage;
      await recallInto(state);
      await saveState(state);
      return state;
    });
  }
  async function resetDemo(resetGBrain: boolean) {
    return exclusive(async () => {
      if (resetGBrain) await resetRemoteMemory();
      const state = initialState();
      await saveState(state);
      return state;
    });
  }
  async function syncMemory() {
    return exclusive(async () => {
      const state = await loadState();
      await recallInto(state);
      const findings = [
        ...followupFindings(state.records),
        ...medicationFindings(state.records),
        ...crossSpecialtyFindings(state.records),
      ]
        .map((f) => reviewFinding(f, state.records))
        .filter((f) => f.reviewer.passed);
      await persistMemory(state, findings);
      await saveState(state);
      return state;
    });
  }
  function requestOutsideRun(actor: string, scopes: Scope[]) {
    return authorize(actor, scopes, "External research", "ended", null, []);
  }
  return { getState, prepareBrief, importFollowup, freshSession, resetDemo, syncMemory, requestOutsideRun };
}
