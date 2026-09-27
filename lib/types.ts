export type Category =
  | "Imaging"
  | "Labs"
  | "Medications"
  | "Notes"
  | "Procedures";
export type FhirResource = {
  resourceType:
    | "DiagnosticReport"
    | "Observation"
    | "MedicationStatement"
    | "Encounter"
    | "Procedure";
  id: string;
  meta: { tag: { system: string; code: string; display: string }[] };
  subject: { reference: string };
  status: string;
  code?: { text: string };
  effectiveDateTime?: string;
  effectivePeriod?: { start: string };
  period?: { start: string };
  performedDateTime?: string;
  conclusion?: string;
  note?: { text: string }[];
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  component?: {
    code: { coding: { system: string; code: string; display: string }[] };
    valueQuantity: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }[];
  medicationCodeableConcept?: { text: string };
  dosage?: { text: string }[];
  class?: { system: string; code: string; display: string };
  type?: { text: string }[];
};
export type HealthRecord = {
  id: string;
  date: string;
  title: string;
  category: Category;
  specialty: string;
  summary: string;
  resource: FhirResource;
  recommendation?: { key: string; due: string };
  fulfills?: string;
};
export type Finding = {
  id: string;
  title: string;
  statement: string;
  status: "verified" | "patient_reported" | "inferred" | "unresolved";
  uncertainty: "low" | "moderate" | "high";
  evidenceIds: string[];
  specialtyTags: string[];
  createdAt: string;
  reviewer: { passed: boolean; reasons: string[] };
};
export type HealthMemoryEntry = {
  id: string;
  patientId: string;
  category:
    | "follow_up"
    | "finding"
    | "medication"
    | "preference"
    | "resolved_question";
  title: string;
  statement: string;
  status: "open" | "resolved" | "reviewed";
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
  resolvedByEvidenceId?: string;
  remoteId?: string;
};
export type Scope =
  | "Timeline"
  | "Imaging"
  | "Lipid Labs"
  | "Blood Pressure"
  | "Medications"
  | "Notes"
  | "Candidate Findings"
  | "Evidence"
  | "Full Record"
  | "De-identified Metadata";
export type AccessEvent = {
  id: string;
  actor: string;
  scopes: Scope[];
  purpose: string;
  result: "Allowed" | "Denied";
  reason: string;
  timestamp: string;
  runId: string;
  recordIds: string[];
};
export type AgentStep = {
  name: string;
  status: "pending" | "running" | "complete" | "failed";
  activity: string;
  scopes: Scope[];
  startedAt?: string;
  completedAt?: string;
};
export type Run = {
  id: string;
  status: "running" | "complete" | "failed";
  startedAt: string;
  completedAt?: string;
  reviewedIds: string[];
  findings: Finding[];
  rejected: Finding[];
  steps: AgentStep[];
  error?: string;
};
export type Connection = {
  connected: boolean;
  message: string;
  checkedAt: string;
  workspaceUrl?: string;
};
export type DemoState = {
  records: HealthRecord[];
  run: Run | null;
  ledger: AccessEvent[];
  memory: HealthMemoryEntry[];
  connection: Connection;
  importMessage?: string;
};
