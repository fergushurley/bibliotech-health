# Architecture and safety

`apps/web` provides Next.js routes and UI. `packages/core` owns contracts, deterministic analysis, access policy, atomic persistence, and the shared `HealthWorkflow.prepareVisit` service. `packages/fhir` normalizes eight requested resource types plus minimal ServiceRequest. `packages/demo-data` supplies coherent fixtures. `packages/gbrain-health-memory` exposes `search`, `get`, `remember`, and `resolve` through the official MCP client.

FHIR is canonical. The store persists sources, runs, pending writes, namespaces and access events to `.data/state.json` via a serialized queue, a temporary file and atomic rename (0600). Workflow mutations are serialized. This is a **single-process prototype**: do not run the standalone CLI concurrently with the web process against that store. There is no distributed or cross-process lock, authentication, encryption-at-rest, or clinical-grade authorization. Keep the loopback binding and use synthetic data only.

The Cloudflare deployment uses the same workflow service with a different store.
Each browser receives a random 256-bit session cookie (`HttpOnly`, `Secure`,
`SameSite=Lax`); each cookie maps to a separate SQLite Durable Object. The object
serializes requests and persists state across Worker restarts. Sessions expire
after 24 hours using a storage alarm. Public history is bounded to the most recent
100 access events and 10 runs. Reset affects only that browser's synthetic data.
Writes require a matching Origin and JSON content, accept at most 1 KiB, and are
limited to 30 actions per minute per session. This is a synthetic demo session
boundary, not a user account system or authorization for real patient records.

The timeline, follow-up, medication, cross-specialty and reviewer stages run deterministic code. They record actual source accesses, stage completion, candidate counts and rejections. No finding reaches the brief or memory without nonempty resolvable evidence IDs and explicit uncertainty. Medication review counts prescription records; it makes no treatment recommendation. The initial brief has three candidates and zero rejected candidates; rejection logic is exercised with deliberately invalid inputs in tests.

The imaging follow-up resolves only for a final report with the same patient, an explicit `DiagnosticReport.basedOn` reference to the ServiceRequest, and an appropriate date. An unrelated mammogram does not resolve it. See the [FHIR R4 report relationship](https://hl7.org/fhir/R4/diagnosticreport.html). Evidence status and follow-up lifecycle are independent: a verified source can support a resolved follow-up, and a saved review preference can have lifecycle `reviewed` without changing source evidence status.

The reviewer validates references and wording, not clinical correctness in arbitrary records. Input is limited to the supplied fixture; this is not a general FHIR ingestion/validation engine. Measurements compare like units. Breast arterial calcification is kept separate from BI-RADS and grounded in the report's own discussion recommendation. Missing documentation never establishes that care did not occur.

Memory stores concise derived statements, stable finding keys, source IDs/dates, evidence status, lifecycle, and timestamps. Raw FHIR is never sent to GBrain. Recalled entries must match the active namespace, patient and available sources. Source evidence always determines whether follow-up is resolved; memory contributes previously reviewed state when the FHIR is fixed. A fresh session clears transient state before an actual provider read. No successful write is claimed until rereading verifies the update. Pending updates are retriable. Reset retains prior external notes.

The access view reflects a local code-enforced resource-class boundary and actual MCP call outcomes. Its research example denies full-record access. It is not a substitute for provider permission enforcement or a production audit system. Provider logs contain operation, outcome, elapsed time, and run IDs in the local access ledger; no token or raw request arguments are logged.
