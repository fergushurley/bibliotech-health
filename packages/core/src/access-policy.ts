import type { AccessEvent } from "./index";
import { randomUUID } from "node:crypto";
const policy: Record<string, string[]> = {
  "Timeline Agent": [
    "Patient",
    "Observation",
    "DiagnosticReport",
    "MedicationRequest",
    "Encounter",
    "Condition",
    "Procedure",
    "DocumentReference",
    "ServiceRequest",
  ],
  "Follow-up Agent": ["DiagnosticReport", "ServiceRequest"],
  "Medication Agent": ["MedicationRequest"],
  "Cross-Specialty Agent": ["Observation", "DiagnosticReport"],
  "Reviewer Agent": [
    "Patient",
    "Observation",
    "DiagnosticReport",
    "MedicationRequest",
    "Encounter",
    "Condition",
    "Procedure",
    "DocumentReference",
    "ServiceRequest",
  ],
  "Research Agent": ["DeidentifiedMetadata"],
};
export function authorizeAccess(
  actor: string,
  resourceClasses: string[],
  runId: string,
): AccessEvent {
  const allowed = resourceClasses.every((c) => policy[actor]?.includes(c));
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor,
    actorType: "workflow",
    purpose:
      actor === "Research Agent"
        ? "Demonstrate research access boundary"
        : "Prepare visit brief",
    resourceClasses,
    mode: "read",
    result: allowed ? "allowed" : "denied",
    runId,
  };
}
