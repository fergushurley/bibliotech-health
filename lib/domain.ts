import { cardiacIds, PATIENT_ID } from './data';
import type { AccessEvent, Finding, HealthMemoryEntry, HealthRecord, Scope } from './types';
const policies: Record<string, { scopes: Scope[]; purpose: string }> = {
  'Timeline Agent': {scopes:['Timeline'],purpose:'Prepare brief'},
  'Follow-Up Agent': {scopes:['Imaging','Notes'],purpose:'Check follow-ups'},
  'Medication Agent': {scopes:['Medications','Notes'],purpose:'Reconcile medications'},
  'Cross-Specialty Agent': {scopes:['Imaging','Lipid Labs','Blood Pressure'],purpose:'Find connections'},
  'Reviewer Agent': {scopes:['Candidate Findings','Evidence'],purpose:'Verify findings'},
  'Research Agent': {scopes:['De-identified Metadata'],purpose:'External research'},
};
export function authorize(actor: string, scopes: Scope[], purpose: string, runId: string, activeRunId: string | null, records: HealthRecord[]): { event: AccessEvent; records: HealthRecord[] } {
  const policy = policies[actor];
  const allowed = !!policy && policy.purpose===purpose && runId===activeRunId && scopes.length>0 && scopes.every(s=>policy.scopes.includes(s));
  const selected = allowed ? records.filter(r=>scopes.includes('Timeline') || scopes.includes('Evidence') || (scopes.includes('Imaging')&&r.category==='Imaging') || (scopes.includes('Notes')&&(r.category==='Notes'||r.category==='Procedures')) || (scopes.includes('Medications')&&r.category==='Medications') || (scopes.includes('Lipid Labs')&&r.id.includes('LDL')) || (scopes.includes('Blood Pressure')&&r.id.endsWith('BP'))) : [];
  return { event: {id:crypto.randomUUID(),actor,scopes,purpose,result:allowed?'Allowed':'Denied',reason:allowed?'Purpose and requested resources match the policy for this active run.':'Requested scope exceeded permitted resources, purpose did not match, or the run has ended.',timestamp:new Date().toISOString(),runId,recordIds:selected.map(r=>r.id)}, records:selected };
}
export function reviewFinding(finding: Finding, records: HealthRecord[]): Finding {
  const reasons: string[] = [];
  if(!finding.evidenceIds.length) reasons.push('No source evidence. Finding withheld.');
  if(finding.evidenceIds.some(id=>!records.some(r=>r.id===id))) reasons.push('One or more source records are unavailable.');
  if(/has cardiovascular disease|diagnosed|you have|definitely|proved|dangerous/i.test(finding.statement)) reasons.push('Unsupported diagnosis. Evidence supports review, not diagnosis.');
  if(/missed|failed to follow up|doctor missed/i.test(finding.statement)) reasons.push('Absence of a record does not prove the follow-up did not occur.');
  if(finding.status==='inferred' && !/may|potential|review/i.test(finding.statement)) reasons.push('Inferred findings must preserve uncertainty.');
  return {...finding, reviewer:{passed:reasons.length===0,reasons:reasons.length?reasons:['All claims linked to source records','No diagnosis asserted','Uncertainty preserved','Connection labeled for review']}};
}
function finding(id:string,title:string,statement:string,evidenceIds:string[],status:Finding['status'],specialtyTags:string[]): Finding {
  return {id,title,statement,evidenceIds,status,specialtyTags,uncertainty:status==='inferred'?'moderate':'low',createdAt:new Date().toISOString(),reviewer:{passed:false,reasons:[]}};
}
export function followupFindings(records:HealthRecord[]): Finding[] {
  const prior=records.find(r=>r.recommendation?.key==='breast-imaging-2024');
  if(!prior || records.some(r=>r.fulfills===prior.recommendation!.key && r.date>prior.date)) return [];
  return [finding('follow-up','Breast imaging follow-up','A March 2024 breast imaging report recommended diagnostic follow-up in six months. No matching follow-up report was found in the records currently available.',[prior.id],'unresolved',['Breast Imaging'])];
}
export function medicationFindings(records:HealthRecord[]): Finding[] {
  const list=records.find(r=>r.id==='MED-2025-1015'), note=records.find(r=>r.id==='ENC-2026-MED');
  if(!list || !note || !list.summary.includes('10 mg') || !note.summary.includes('20 mg')) return [];
  return [finding('medication','Confirm current atorvastatin dose','The medication list shows atorvastatin 10 mg daily, while a later note records a patient-reported dose of 20 mg. Consider confirming the current dose.',[list.id,note.id],'unresolved',['Primary Care'])];
}
export function crossSpecialtyFindings(records:HealthRecord[]): Finding[] {
  if(!cardiacIds.every(id=>records.some(r=>r.id===id))) return [];
  const imaging=records.find(r=>r.id===cardiacIds[0])!;
  const lipids=records.filter(r=>/^OBS-202[1-5]-LDL$/.test(r.id)).sort((a,b)=>a.date.localeCompare(b.date));
  const pressures=records.filter(r=>r.id.endsWith('-BP')).sort((a,b)=>a.date.localeCompare(b.date));
  if(!imaging.summary.includes('arterial calcifications') || lipids.some((r,i)=>i>0 && (r.resource.valueQuantity?.value??0)<=(lipids[i-1].resource.valueQuantity?.value??0)) || pressures.some((r,i)=>i>0 && (r.resource.component?.[0].valueQuantity.value??0)<=(pressures[i-1].resource.component?.[0].valueQuantity.value??0))) return [];
  return [finding('cross-specialty-cardiovascular','Potential cardiovascular context',"Breast arterial calcification appears in a recent imaging report alongside rising LDL and blood-pressure measurements. This combination may be relevant to cardiovascular risk review with the patient's clinician.",cardiacIds,'inferred',['Breast Imaging','Laboratory','Primary Care']),finding('rejected-diagnosis','Unsupported diagnosis','Patient has cardiovascular disease.',cardiacIds,'inferred',['Primary Care'])];
}
export function absenceCandidate(records:HealthRecord[]): Finding[] {
  return followupFindings(records).length ? [finding('rejected-absence','Unsupported assumption','Patient missed mammogram follow-up.',['DR-2024-0312'],'unresolved',['Breast Imaging'])] : [];
}
export function buildMemory(findings:Finding[],records:HealthRecord[],previous:HealthMemoryEntry[]): HealthMemoryEntry[] {
  const now=new Date().toISOString();
  const entries=findings.map(f=>({id:`BT-MEM-${f.id}`,patientId:PATIENT_ID,category:(f.id==='follow-up'?'follow_up':f.id==='medication'?'medication':'finding') as HealthMemoryEntry['category'],title:f.id==='medication'?'Atorvastatin dose requires confirmation':f.title,statement:f.statement,status:(f.id==='cross-specialty-cardiovascular'?'reviewed':'open') as HealthMemoryEntry['status'],evidenceIds:f.evidenceIds,createdAt:previous.find(m=>m.id===`BT-MEM-${f.id}`)?.createdAt??now,updatedAt:now}));
  const resolved=records.find(r=>r.fulfills==='breast-imaging-2024');
  if(resolved && records.some(r=>r.id==='DR-2024-0312')) entries.unshift({id:'BT-MEM-follow-up',patientId:PATIENT_ID,category:'resolved_question',title:'Breast imaging follow-up',statement:'Follow-up imaging dated September 18, 2024 has now been matched to the March 2024 recommendation.',status:'resolved',evidenceIds:['DR-2024-0312',resolved.id],createdAt:previous.find(m=>m.id==='BT-MEM-follow-up')?.createdAt??now,updatedAt:now,...{resolvedByEvidenceId:resolved.id}});
  return entries;
}
