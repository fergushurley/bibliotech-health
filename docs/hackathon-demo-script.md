# BiblioTech Health — hackathon demo script

**Target length:** 105–115 seconds, including clicks.  
**Hook:** All your priors. One intelligence.  
**Recording:** 1440 × 900. Use the populated synthetic demo at `http://127.0.0.1:3101/priors`.

| Time      | Show / action                                                                                                               | Say                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:10 | Start on **Priors**, with the title and record counts visible.                                                              | “All your priors. One intelligence. BiblioTech connects your medical history across specialties into evidence-grounded intelligence.”                                                     |
| 0:10–0:22 | Scroll through the timeline. Briefly open a source record, then close it.                                                   | “This is a completely fictional patient: twenty-five synthetic records, eight years, six specialties. Labs, imaging, medications, and notes become one history you can actually inspect.” |
| 0:22–0:35 | Click **Prepare My Visit**. Show the three cards on **Visit Brief**.                                                        | “Prepare My Visit surfaces three questions: an imaging follow-up needing confirmation, a potential connection across specialties, and a medication dose discrepancy.”                     |
| 0:35–0:49 | Open **View Evidence** on the cardiovascular card. Scroll just enough to show the graph’s conclusion.                       | “Here, an imaging observation connects with lipid and blood-pressure trends. Every source is linked. The finding preserves uncertainty and asks for clinician review.”                    |
| 0:49–1:03 | Open **Agents** to show the rejected candidates, then **Access** and its denied row.                                        | “The reviewer rejects unsupported diagnoses and assumptions about missing care. A deliberately overbroad research request is denied by code, returning zero patient records.”             |
| 1:03–1:20 | Open **Memory → Import New Record → Import Record**. Show the local follow-up match.                                        | “Now add the missing follow-up report. It matches the original recommendation, updates the evidence, and retires the old brief.”                                                          |
| 1:20–1:32 | Click **Start Fresh Session**, then **Prepare My Visit**. Show the two remaining findings and the matched-follow-up banner. | “Start a fresh session and prepare again. The record persists, and the outdated missing-report question is gone.”                                                                         |
| 1:32–1:45 | Show the landing page’s integration section, or stay on **Memory** with the connection status visible.                      | “GBrain is our memory integration; QM is planned for repeatable agent orchestration. This recording demonstrates local persistence, with live integration work clearly labeled.”          |
| 1:45–1:52 | End on the product title or landing-page headline.                                                                          | “Clearer questions. Evidence you can inspect. BiblioTech Health. All your priors. One intelligence.”                                                                                      |

## Before recording

- Start with 25 records and the three-question brief. If the follow-up is already imported, use **Demo → Reset Demo** and leave the GBrain reset checkbox unchecked. With remote memory connected, preserved resolution may be recalled; use a separately prepared demo namespace if you need a clean remote run.
- Close source drawers before moving between screens. Use the cardiovascular card for the evidence graph.
- On the current disconnected build, point to **Follow-up matched in your records**, not a GBrain “Resolved” card. The script deliberately calls this **local persistence**.
- The workflow is deterministic. Do not describe this recording as live LLM execution or live QM orchestration.

## Upgrade the GBrain lines only after a verified live run

If a genuine GBrain connection is configured, the import is written and independently recalled, and a fresh session retrieves the resolved entry, replace the import/fresh-session narration with:

> “Now add the missing follow-up report. It matches the original recommendation, and the evidence-linked memory is updated in GBrain. Start a fresh session: BiblioTech recalls the resolved question, and the outdated finding stays gone.”

Replace the integration narration with:

> “GBrain carries this verified context between sessions. QM is our planned orchestration layer for a repeatable Health Priors workflow. Every finding remains inspectable, and every request has a purpose.”

Keep QM described as planned until its actual runtime has been connected and verified. Do not replace live application footage with conceptual or generated images.
