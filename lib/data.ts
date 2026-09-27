import type { Category, FhirResource, HealthRecord } from './types';
export const PATIENT_ID = 'demo-jordan-taylor';
export const patient = { resourceType: 'Patient', id: PATIENT_ID, meta: { tag: [{ system: 'https://bibliotech.demo/tags', code: 'synthetic', display: 'Synthetic demo data' }] }, name: [{ use: 'official', family: 'Taylor', given: ['Jordan'] }], gender: 'female', birthDate: '1975-05-18', address: [{ state: 'CA', country: 'US' }] };
function record(id: string, date: string, title: string, category: Category, specialty: string, summary: string, type: FhirResource['resourceType'] = 'Encounter', extra: Partial<HealthRecord> = {}): HealthRecord {
  const resource: FhirResource = { resourceType: type, id, meta: patient.meta, subject: { reference: `Patient/${PATIENT_ID}` }, status: type === 'Encounter' ? 'finished' : type === 'DiagnosticReport' || type === 'Observation' ? 'final' : type === 'MedicationStatement' ? 'active' : 'completed', note: [{ text: summary }] };
  if (type === 'Encounter') { delete resource.note; resource.type = [{ text: title + '. ' + summary }]; resource.period = { start: date }; resource.class = { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' }; }
  else if (type === 'Procedure') resource.performedDateTime = date;
  else resource.effectiveDateTime = date;
  if (type === 'MedicationStatement') { resource.medicationCodeableConcept = { text: title }; resource.dosage = [{ text: summary }]; }
  else if (type !== 'Encounter') resource.code = { text: title };
  if (type === 'DiagnosticReport') { delete resource.note; resource.conclusion = summary; }
  return { id, date, title, category, specialty, summary, resource, ...extra };
}
const quantity = (value: number, unit: string, code: string) => ({ value, unit, system: 'http://unitsofmeasure.org', code });
export const lipidRecords = [122,128,135,146,152].map((value, i) => {
  const year = 2021+i; const item = record(`OBS-${year}-LDL`, `${year}-03-05`, 'Lipid Panel', 'Labs', 'Laboratory', `LDL: ${value} mg/dL`, 'Observation');
  item.resource.valueQuantity = quantity(value, 'mg/dL', 'mg/dL'); return item;
});
export const bpRecords = [[124,78],[129,81],[134,84],[138,86]].map(([s,d],i) => {
  const year = 2022+i; const item = record(`OBS-${year}-BP`, `${year}-02-17`, 'Blood Pressure', 'Labs', 'Primary Care', `${s}/${d} mmHg`, 'Observation');
  item.resource.component = [{ code: { coding: [{ system: 'http://loinc.org', code:'8480-6', display:'Systolic blood pressure' }] }, valueQuantity:quantity(s,'mmHg','mm[Hg]') },{ code:{ coding:[{ system:'http://loinc.org',code:'8462-4',display:'Diastolic blood pressure' }] },valueQuantity:quantity(d,'mmHg','mm[Hg]') }]; return item;
});
export const followupRecord = record('DR-2024-0918','2024-09-18','6-Month Follow-up Diagnostic Mammogram','Imaging','Breast Imaging','Stable appearance compared with prior examination. Return to routine annual screening.','DiagnosticReport',{ fulfills:'breast-imaging-2024' });
export const initialRecords: HealthRecord[] = [
  record('ENC-2026-0210','2026-02-10','Annual wellness visit','Notes','Primary Care','Blood pressure: 136/84. Medication reconciliation performed.'),
  record('OBS-2026-LDL','2026-01-22','Lipid Panel','Labs','Laboratory','LDL: 149 mg/dL · HDL: 57 mg/dL · Triglycerides: 109 mg/dL','Observation'),
  record('ENC-2026-MED','2026-02-10','Medication reconciliation note','Notes','Primary Care','Patient reports taking atorvastatin 20 mg daily. Current dose requires confirmation.'),
  record('MED-2025-1015','2025-10-15','Atorvastatin 10 mg daily','Medications','Primary Care','Atorvastatin 10 mg daily. Started October 15, 2025.','MedicationStatement'),
  record('DR-2025-0604-MAMMO','2025-06-04','Screening Mammogram','Imaging','Breast Imaging','Breast arterial calcifications noted incidentally. Breast finding otherwise benign.','DiagnosticReport'),
  record('ENC-2025-DERM','2025-04-11','Routine skin examination','Notes','Dermatology','Routine skin examination. Sun protection discussed.'),
  record('DR-2024-0312','2024-03-12','Diagnostic Mammogram','Imaging','Breast Imaging','Probably benign focal asymmetry in the left breast. 6-month diagnostic mammographic follow-up recommended.','DiagnosticReport',{ recommendation: { key:'breast-imaging-2024',due:'2024-09-12' } }),
  record('ENC-2024-GI','2024-04-04','Screening colonoscopy referral','Notes','Gastroenterology','Routine screening colonoscopy recommended.','Encounter',{ recommendation:{key:'colonoscopy-2024',due:'2024-08-04'} }),
  record('PROC-2024-GI','2024-07-19','Screening colonoscopy','Procedures','Gastroenterology','Screening examination completed. No polyps reported.','Procedure',{ fulfills:'colonoscopy-2024' }),
  record('ENC-2023-ORTHO','2023-08-21','Knee follow-up','Notes','Orthopedics','Knee discomfort improved following physical therapy.'),
  record('ENC-2022-DERM','2022-05-06','Skin review','Notes','Dermatology','Benign skin findings documented. Routine care discussed.'),
  record('ENC-2021-PCP','2021-11-08','Preventive care visit','Notes','Primary Care','Preventive care reviewed. Regular activity discussed.'),
  record('ENC-2020-PCP','2020-09-14','Primary care check-in','Notes','Primary Care','General health review. No medication changes recorded.'),
  record('PROC-2019-ORTHO','2019-06-10','Physical therapy completed','Procedures','Orthopedics','Physical therapy course for knee discomfort completed.','Procedure'),
  record('ENC-2018-PCP','2018-05-24','Establish care','Notes','Primary Care','Baseline medical and preventive-care history recorded.'),
  record('PROC-2018-VAX','2018-10-08','Seasonal immunization','Procedures','Primary Care','Seasonal influenza immunization documented.','Procedure'),
  ...lipidRecords,...bpRecords,
].sort((a,b)=>b.date.localeCompare(a.date));
initialRecords.find(r=>r.id==='OBS-2026-LDL')!.resource.valueQuantity = quantity(149,'mg/dL','mg/dL');
export const cardiacIds = ['DR-2025-0604-MAMMO',...lipidRecords.map(r=>r.id),...bpRecords.map(r=>r.id)];
export const relevantIds = [...cardiacIds,'DR-2024-0312','MED-2025-1015','ENC-2026-MED','ENC-2024-GI','PROC-2024-GI','ENC-2018-PCP','ENC-2026-0210'];
export function asBundle(records: HealthRecord[]) { return { resourceType:'Bundle', type:'collection', meta:patient.meta, entry:[{fullUrl:`https://bibliotech.example/fhir/Patient/${PATIENT_ID}`,resource:patient},...records.map(r=>({fullUrl:`https://bibliotech.example/fhir/${r.resource.resourceType}/${r.id}`,resource:r.resource}))] }; }
