export type EvidenceStatus =
  "verified" | "patient_reported" | "inferred" | "unresolved";
export type ResourceType =
  | "Patient"
  | "Observation"
  | "DiagnosticReport"
  | "MedicationRequest"
  | "Encounter"
  | "Condition"
  | "Procedure"
  | "DocumentReference"
  | "ServiceRequest";
export interface FhirResource {
  resourceType: ResourceType;
  id: string;
  [key: string]: any;
}
export interface Patient {
  id: string;
  name: string;
  sex: string;
  birthDate: string;
  synthetic: true;
}
export type EventCategory =
  | "Imaging"
  | "Labs"
  | "Vitals"
  | "Medications"
  | "Notes"
  | "Encounters"
  | "Procedures"
  | "Conditions"
  | "Follow-ups";
export interface HealthEvent {
  id: string;
  resourceId: string;
  date: string;
  title: string;
  summary: string;
  category: EventCategory;
  specialty: string;
  value?: number;
  unit?: string;
  code?: string;
}
export interface EvidenceReference {
  id: string;
  resourceType: ResourceType;
  date: string;
  title: string;
  specialty: string;
  excerpt: string;
  resource: FhirResource;
}
export interface Finding {
  id: string;
  title: string;
  statement: string;
  evidenceIds: [string, ...string[]];
  status: EvidenceStatus;
  uncertainty: string;
  specialtyTags: string[];
  createdAt: string;
  category: "Follow-ups" | "Changes" | "Cross-specialty signals";
  rationale: string;
  question: string;
}
export interface FollowUp {
  id: string;
  orderId: string;
  sourceId: string;
  dueDate: string;
  lifecycle: "open" | "resolved";
  resolvedBy?: string;
}
export interface MemoryEntry {
  key: string;
  namespace: string;
  patientId: string;
  title: string;
  statement: string;
  evidenceIds: string[];
  status: EvidenceStatus;
  lifecycle: "open" | "resolved" | "reviewed";
  updatedAt: string;
  sourceDates: string[];
  providerId?: string;
  recalledAt?: string;
}
export interface AccessEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: "workflow" | "memory";
  purpose: string;
  resourceClasses: string[];
  mode: "read" | "write";
  result: "allowed" | "denied" | "failed";
  runId: string;
  detail?: string;
}
export interface AgentRun {
  id: string;
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "complete" | "failed";
  stages: {
    name: string;
    status: "running" | "complete" | "failed";
    detail: string;
    at: string;
  }[];
  candidateCount: number;
  supportedCount: number;
  rejected: { title: string; reason: string }[];
  memoryStatus: "connected" | "unavailable" | "pending";
  error?: string;
}
export interface VisitBrief {
  id: string;
  runId: string;
  generatedAt: string;
  findings: Finding[];
  questions: { text: string; evidenceIds: string[] }[];
  sourceCount: number;
  followUp: FollowUp;
  memoryUsed: MemoryEntry[];
  memoryStatus: "connected" | "unavailable" | "pending";
  memoryMessage?: string;
  previouslyReviewed: string[];
}
export interface HealthMemory {
  search(namespace: string): Promise<MemoryEntry[]>;
  get(id: string): Promise<MemoryEntry>;
  remember(entry: MemoryEntry): Promise<MemoryEntry>;
  resolve(entry: MemoryEntry): Promise<MemoryEntry>;
  close?(): Promise<void>;
}
export interface AppState {
  version: 1;
  namespace: string;
  sessionId: string;
  resources: FhirResource[];
  runs: AgentRun[];
  access: AccessEvent[];
  brief?: VisitBrief;
  memory: MemoryEntry[];
  pendingMemory: MemoryEntry[];
  imported: boolean;
  lastMemoryError?: string;
}
