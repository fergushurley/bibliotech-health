import type { FhirResource } from "../../core/src/index";
export const PATIENT_ID = "jordan-taylor-synthetic";
export const SNAPSHOT_DATE = "2026-09-19";
const subject = { reference: `Patient/${PATIENT_ID}` };
const coding = (code: string, text: string) => ({
  coding: [{ system: "http://loinc.org", code, display: text }],
  text,
});
const tag = {
  tag: [
    {
      system: "https://bibliotech.health/demo",
      code: "synthetic",
      display: "Synthetic demo data",
    },
  ],
};
const report = (
  id: string,
  date: string,
  title: string,
  conclusion: string,
  extra = {},
): FhirResource => ({
  resourceType: "DiagnosticReport",
  id,
  meta: tag,
  status: "final",
  subject,
  category: [{ text: "Imaging" }],
  code: { text: title },
  effectiveDateTime: date,
  issued: `${date}T12:00:00Z`,
  conclusion,
  ...extra,
});
import fixture from "../fixtures/followup-mammogram-2026-09.json";
export const followupReport = fixture as FhirResource;
export function seedResources(): FhirResource[] {
  return [
    {
      resourceType: "Patient",
      id: PATIENT_ID,
      meta: tag,
      name: [{ given: ["Jordan"], family: "Taylor" }],
      gender: "female",
      birthDate: "1976-06-15",
    },
    ...[114, 119, 128, 137, 149, 156].map((value, i): FhirResource => ({
      resourceType: "Observation",
      id: `ldl-${2018 + i * 1 + (i > 2 ? 2 : 0)}`,
      meta: tag,
      status: "final",
      subject,
      category: [{ text: "Laboratory" }],
      code: coding("13457-7", "LDL cholesterol"),
      effectiveDateTime: [
        "2018-06-10",
        "2020-05-12",
        "2022-07-09",
        "2024-03-22",
        "2025-08-10",
        "2026-08-22",
      ][i],
      valueQuantity: {
        value,
        unit: "mg/dL",
        system: "http://unitsofmeasure.org",
        code: "mg/dL",
      },
    })),
    ...[
      [118, 76],
      [121, 78],
      [126, 80],
      [130, 82],
      [134, 84],
      [136, 86],
    ].map(([s, d], i): FhirResource => ({
      resourceType: "Observation",
      id: `bp-${i}`,
      meta: tag,
      status: "final",
      subject,
      category: [{ text: "Vital signs" }],
      code: coding("85354-9", "Blood pressure"),
      effectiveDateTime: [
        "2018-06-10",
        "2020-05-12",
        "2022-07-09",
        "2024-03-22",
        "2025-08-10",
        "2026-08-22",
      ][i],
      component: [
        {
          code: coding("8480-6", "Systolic blood pressure"),
          valueQuantity: { value: s, unit: "mmHg" },
        },
        {
          code: coding("8462-4", "Diastolic blood pressure"),
          valueQuantity: { value: d, unit: "mmHg" },
        },
      ],
    })),
    {
      resourceType: "Observation",
      id: "breast-arterial-calcification-2025",
      meta: tag,
      status: "final",
      subject,
      code: { text: "Breast arterial calcification" },
      effectiveDateTime: "2025-03-08",
      valueString:
        "Breast arterial calcification described as an incidental imaging observation. Separate from the breast assessment category.",
    },
    report(
      "mammogram-2022",
      "2022-03-04",
      "Screening mammogram",
      "No suspicious imaging finding described in this synthetic screening report.",
    ),
    report(
      "mammogram-2025",
      "2025-03-08",
      "Screening mammogram",
      "Incidental breast arterial calcification is noted. The report suggests discussing this observation with primary care alongside lipid and blood-pressure history. This is not a cardiovascular diagnosis.",
      {
        result: [
          { reference: "Observation/breast-arterial-calcification-2025" },
        ],
      },
    ),
    report(
      "mammogram-2026-03",
      "2026-03-12",
      "Diagnostic mammogram",
      "BI-RADS 3: probably benign focal finding. Six-month follow-up imaging recommended. This breast assessment is distinct from the earlier arterial calcification observation.",
    ),
    {
      resourceType: "ServiceRequest",
      id: "breast-followup-2026",
      meta: tag,
      status: "active",
      intent: "order",
      subject,
      code: { text: "Six-month follow-up mammogram" },
      authoredOn: "2026-03-12",
      occurrenceDateTime: "2026-09-12",
      supportingInfo: [{ reference: "DiagnosticReport/mammogram-2026-03" }],
    },
    ...["2018-06-10", "2024-03-22", "2026-08-22"].map(
      (date, i): FhirResource => ({
        resourceType: "Encounter",
        id: `primary-care-${i}`,
        meta: tag,
        status: "finished",
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "AMB",
        },
        subject,
        period: { start: date, end: date },
        type: [{ text: "Primary-care review" }],
      }),
    ),
    {
      resourceType: "MedicationRequest",
      id: "cetirizine-2020",
      meta: tag,
      status: "stopped",
      intent: "order",
      subject,
      authoredOn: "2020-05-12",
      medicationCodeableConcept: { text: "Cetirizine 10 mg" },
      dosageInstruction: [{ text: "As recorded: daily during allergy season" }],
    },
    {
      resourceType: "MedicationRequest",
      id: "cetirizine-2026",
      meta: tag,
      status: "active",
      intent: "order",
      subject,
      authoredOn: "2026-08-22",
      medicationCodeableConcept: { text: "Cetirizine 10 mg" },
      dosageInstruction: [
        { text: "As recorded: as needed for seasonal symptoms" },
      ],
    },
    ...[
      [
        "2024-03-22",
        "Primary-care note",
        "Lipid and blood-pressure measurements reviewed. Continue discussing longitudinal changes at routine visits.",
      ],
      [
        "2026-08-22",
        "Visit preparation note",
        "Patient reports a preference for a short written question list. The imported record set does not yet include the recommended follow-up imaging.",
      ],
    ].map(([date, title, text], i): FhirResource => ({
      resourceType: "DocumentReference",
      id: `care-note-${i}`,
      meta: tag,
      status: "current",
      subject,
      date: `${date}T12:00:00Z`,
      type: { text: title },
      description: text,
      content: [
        {
          attachment: {
            contentType: "text/plain",
            title,
            data: Buffer.from(text).toString("base64"),
          },
        },
      ],
    })),
    {
      resourceType: "Procedure",
      id: "immunization-review-2023",
      meta: tag,
      status: "completed",
      subject,
      code: { text: "Preventive health counseling" },
      performedDateTime: "2023-06-08",
    },
    {
      resourceType: "Condition",
      id: "seasonal-allergy-2018",
      meta: tag,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      subject,
      code: { text: "Seasonal allergic rhinitis, recorded history" },
      onsetDateTime: "2018-06-10",
      recordedDate: "2018-06-10",
    },
  ];
}
