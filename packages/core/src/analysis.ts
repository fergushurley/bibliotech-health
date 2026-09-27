import type {
  EvidenceReference,
  FhirResource,
  Finding,
  FollowUp,
  MemoryEntry,
} from "./index";
import { normalizeRecords, resourceId } from "../../fhir/src/index";
export function detectFollowUp(resources: FhirResource[]): FollowUp {
  const order = resources.find(
    (r) =>
      r.resourceType === "ServiceRequest" && r.id === "breast-followup-2026",
  );
  if (!order) throw new Error("The synthetic follow-up order is missing.");
  const matching = resources.find(
    (r) =>
      r.resourceType === "DiagnosticReport" &&
      r.status === "final" &&
      r.subject?.reference === order.subject?.reference &&
      r.basedOn?.some((x: any) => x.reference === resourceId(order)) &&
      r.effectiveDateTime >= order.authoredOn,
  );
  return {
    id: "breast-followup",
    orderId: resourceId(order),
    sourceId: order.supportingInfo[0].reference,
    dueDate: order.occurrenceDateTime,
    lifecycle: matching ? "resolved" : "open",
    resolvedBy: matching ? resourceId(matching) : undefined,
  };
}
export function candidateFindings(
  resources: FhirResource[],
  now: string,
): Finding[] {
  const followUp = detectFollowUp(resources);
  const events = normalizeRecords(resources);
  const ldl = events
    .filter((e) => e.code === "13457-7" && e.unit === "mg/dL")
    .sort((a, b) => a.date.localeCompare(b.date));
  const bp = events
    .filter((e) => e.code === "85354-9")
    .sort((a, b) => a.date.localeCompare(b.date));
  const findings: Finding[] = [];
  if (followUp.lifecycle === "open")
    findings.push({
      id: "breast-followup",
      title: "A follow-up worth confirming",
      statement:
        "The March imaging report recommended six-month follow-up. No matching follow-up report was found in the records currently available.",
      evidenceIds: [followUp.sourceId, followUp.orderId],
      status: "unresolved",
      uncertainty:
        "An absent record does not establish that the appointment or imaging did not happen.",
      specialtyTags: ["Radiology"],
      createdAt: now,
      category: "Follow-ups",
      rationale:
        "An explicit imaging recommendation and its order are present, but no final report links to that order in this imported record set.",
      question:
        "Can we confirm the recommended imaging was completed and obtain the report?",
    });
  if (ldl.length >= 2 && bp.length >= 2)
    findings.push({
      id: "longitudinal-measurements",
      title: "Bring the longer view",
      statement: `Recorded LDL changed from ${ldl[0].value} to ${ldl.at(-1)!.value} mg/dL; recorded blood pressure changed from ${bp[0].summary} to ${bp.at(-1)!.summary}.`,
      evidenceIds: [ldl[0].id, ldl.at(-1)!.id, bp[0].id, bp.at(-1)!.id],
      status: "verified",
      uncertainty:
        "These are recorded measurements, not a diagnosis. Measurement conditions and clinical context may differ.",
      specialtyTags: ["Primary care"],
      createdAt: now,
      category: "Changes",
      rationale:
        "The earliest and latest comparable values in the imported history differ. Values are compared only within the same recorded units.",
      question:
        "How should we interpret these measurement changes in the context of my overall history?",
    });
  const bac = resources.find(
    (r) => r.id === "breast-arterial-calcification-2025",
  );
  const report = resources.find(
    (r) =>
      r.id === "mammogram-2025" &&
      r.result?.some(
        (x: any) =>
          x.reference === "Observation/breast-arterial-calcification-2025",
      ),
  );
  if (bac && report && ldl.length && bp.length)
    findings.push({
      id: "cross-specialty-context",
      title: "One connection across specialties",
      statement:
        "An earlier imaging report noted breast arterial calcification and suggested a primary-care discussion alongside lipid and blood-pressure history.",
      evidenceIds: [
        resourceId(report),
        resourceId(bac),
        ldl.at(-1)!.id,
        bp.at(-1)!.id,
      ],
      status: "inferred",
      uncertainty:
        "This discussion prompt follows the report’s recommendation. It does not establish cardiovascular disease or estimate risk.",
      specialtyTags: ["Radiology", "Primary care"],
      createdAt: now,
      category: "Cross-specialty signals",
      rationale:
        "The imaging observation and longitudinal measurements are available across specialties. Breast arterial calcification is separate from the BI-RADS 3 breast finding.",
      question:
        "Is the incidental imaging observation relevant to our cardiovascular risk review?",
    });
  return findings;
}
export function reviewFindings(
  candidates: Finding[],
  evidence: EvidenceReference[],
) {
  const known = new Set(evidence.map((e) => e.id));
  const supported: Finding[] = [];
  const rejected: { title: string; reason: string }[] = [];
  for (const f of candidates) {
    let reason = "";
    if (!f.evidenceIds?.length || f.evidenceIds.some((id) => !known.has(id)))
      reason = "Missing or unresolved source evidence";
    else if (!f.uncertainty?.trim()) reason = "Uncertainty must be explicit";
    else if (
      /\b(you have|this proves|doctor missed|did not (attend|complete|have)|never (attended|completed))\b/i.test(
        f.statement,
      )
    )
      reason = "Statement overstates what the evidence establishes";
    if (reason) rejected.push({ title: f.title, reason });
    else supported.push(f);
  }
  return { supported, rejected };
}
export function validMemory(
  entries: MemoryEntry[],
  namespace: string,
  resources: FhirResource[],
) {
  const ids = new Set(resources.map(resourceId));
  return entries.filter(
    (e) =>
      e.namespace === namespace &&
      e.patientId === resources.find((r) => r.resourceType === "Patient")?.id &&
      e.evidenceIds.length > 0 &&
      e.evidenceIds.every((id) => ids.has(id)),
  );
}
export function prioritizeFindings(findings: Finding[], memory: MemoryEntry[]) {
  const reviewed = memory.filter((m) => m.lifecycle === "reviewed");
  return {
    findings: findings.filter(
      (f) =>
        !reviewed.some(
          (m) =>
            m.key.endsWith(`/${f.id}`) &&
            f.evidenceIds.every((id) => m.evidenceIds.includes(id)),
        ),
    ),
    previouslyReviewed: findings
      .filter((f) =>
        reviewed.some(
          (m) =>
            m.key.endsWith(`/${f.id}`) &&
            f.evidenceIds.every((id) => m.evidenceIds.includes(id)),
        ),
      )
      .map((f) => f.title),
  };
}
