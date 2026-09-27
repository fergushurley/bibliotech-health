import type {
  EvidenceReference,
  FhirResource,
  HealthEvent,
  Patient,
  EventCategory,
} from "../../core/src/index";
const types = [
  "Patient",
  "Observation",
  "DiagnosticReport",
  "MedicationRequest",
  "Encounter",
  "Condition",
  "Procedure",
  "DocumentReference",
  "ServiceRequest",
];
export function validateResource(value: unknown): FhirResource {
  if (!value || typeof value !== "object")
    throw new Error("Expected a FHIR resource.");
  const r = value as FhirResource;
  if (
    !types.includes(r.resourceType) ||
    typeof r.id !== "string" ||
    !/^[A-Za-z0-9.-]+$/.test(r.id)
  )
    throw new Error("Unsupported resource type or invalid resource ID.");
  return r;
}
export const resourceId = (r: FhirResource) => `${r.resourceType}/${r.id}`;
export function normalizePatient(r: FhirResource): Patient {
  if (r.resourceType !== "Patient") throw new Error("Expected Patient.");
  return {
    id: r.id,
    name: [...(r.name?.[0]?.given ?? []), r.name?.[0]?.family]
      .filter(Boolean)
      .join(" "),
    sex: r.gender,
    birthDate: r.birthDate,
    synthetic: true,
  };
}
export function normalizeResource(raw: FhirResource): HealthEvent | null {
  const r = validateResource(raw);
  if (r.resourceType === "Patient") return null;
  const date =
    r.effectiveDateTime ??
    r.effectivePeriod?.start ??
    r.authoredOn ??
    r.period?.start ??
    r.performedDateTime ??
    r.performedPeriod?.start ??
    r.date ??
    r.onsetDateTime ??
    r.recordedDate;
  if (!date || !Number.isFinite(Date.parse(date)))
    throw new Error(`Missing or invalid date: ${resourceId(r)}`);
  let category: EventCategory = "Notes";
  let title =
    r.code?.text ??
    r.code?.coding?.[0]?.display ??
    r.type?.text ??
    r.type?.[0]?.text ??
    r.resourceType;
  let summary = r.conclusion ?? r.description ?? r.valueString ?? "";
  if (r.resourceType === "DiagnosticReport") category = "Imaging";
  if (r.resourceType === "Observation") {
    category = r.component ? "Vitals" : r.valueQuantity ? "Labs" : "Imaging";
    if (r.valueQuantity)
      summary = `${r.valueQuantity.value} ${r.valueQuantity.unit}`;
    if (r.component)
      summary = `${r.component.find((x: any) => x.code.coding?.[0]?.code === "8480-6")?.valueQuantity.value}/${r.component.find((x: any) => x.code.coding?.[0]?.code === "8462-4")?.valueQuantity.value} mmHg`;
  }
  if (r.resourceType === "MedicationRequest") {
    category = "Medications";
    title = r.medicationCodeableConcept?.text ?? "Medication";
    summary = `${r.status} · ${r.dosageInstruction?.[0]?.text ?? "See source"}`;
  }
  if (r.resourceType === "Encounter") {
    category = "Encounters";
    summary = "Completed primary-care encounter";
  }
  if (r.resourceType === "Procedure") {
    category = "Procedures";
    summary = r.status;
  }
  if (r.resourceType === "Condition") {
    category = "Conditions";
    summary = "Recorded history; not a new assessment";
  }
  if (r.resourceType === "ServiceRequest") {
    category = "Follow-ups";
    summary = `Recommended for ${r.occurrenceDateTime}`;
  }
  return {
    id: resourceId(r),
    resourceId: resourceId(r),
    date: date.slice(0, 10),
    title,
    summary,
    category,
    specialty:
      category === "Imaging" || category === "Follow-ups"
        ? "Radiology"
        : "Primary care",
    value: r.valueQuantity?.value,
    unit: r.valueQuantity?.unit,
    code: r.code?.coding?.[0]?.code,
  };
}
export function normalizeRecords(resources: FhirResource[]): HealthEvent[] {
  return resources
    .map(normalizeResource)
    .filter((e): e is HealthEvent => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function evidenceFor(resources: FhirResource[]): EvidenceReference[] {
  const byId = new Map(resources.map((r) => [resourceId(r), r]));
  return normalizeRecords(resources).map((e) => ({
    id: e.id,
    resourceType: byId.get(e.id)!.resourceType,
    date: e.date,
    title: e.title,
    specialty: e.specialty,
    excerpt: e.summary,
    resource: byId.get(e.id)!,
  }));
}
