# Verification — September 27, 2026

The final synthetic snapshot is September 19, 2026, shifted two years forward at the user's request. Records span 2018–2026; Jordan remains 50.

| Check                                                                        | Result                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ESLint                                                                       | Passed                                                              |
| TypeScript strict check                                                      | Passed                                                              |
| Vitest                                                                       | 19 tests passed                                                     |
| Next.js production build                                                     | Passed with webpack                                                 |
| Chrome UI smoke at 1440×900                                                  | Passed; no page errors or horizontal overflow                       |
| Actual local GBrain tools/list                                               | Inspected; schema saved locally                                     |
| Actual local GBrain read/create/update/fresh-client reread                   | Passed                                                              |
| Reset → prepare → evidence → import → resolved memory → fresh read → prepare | Passed twice against real local GBrain after the date shift         |
| Fixed FHIR, changed remembered review state                                  | Passed against real GBrain; the later brief omits the reviewed item |
| Standalone shared CLI                                                        | Passed with three supported findings and verified GBrain writes     |
| QM skill format validation                                                   | Passed                                                              |
| Credential and machine-path scan of repository files                         | Passed; env and store remain ignored                                |
| Original MIT license                                                         | Preserved                                                           |

The UI test exercises filters, search, evidence expansion, fixture import, actual memory readback, Fresh Session, and code-enforced research-access denial. Source counts are computed. Screenshots are generated in gitignored `test-results/`.

Unit tests cover all supported FHIR types, invalid evidence rejection, comparable measurements, explicit order matching, duplicate import, separate evidence and lifecycle states, serialized writes, failed synchronization/retry, namespace isolation, recalled review state, and the observed MCP multi-block response. Provider refusal and stale reread tests use a clearly identified test double. They do not establish live hosted permission enforcement.

Local GBrain uses the installed store through MCP stdio and local user permissions. Hosted Streamable HTTP authentication/permission behavior remains unverified. No hosted token was used. Live QM runtime verification remains pending; its skill format and shared CLI were checked. No QM memory provider, live QM orchestration, arbitrary import, optional LLM synthesis, deployment, or real patient support is claimed.

The local JSON store is safe for one application process with serialized operations; multi-process/distributed persistence is deferred. The deterministic reviewer validates references and limited wording, not arbitrary clinical correctness. The UI access ledger demonstrates a local resource-class policy and is not a provider audit log.
