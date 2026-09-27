# BiblioTech Health

**All your priors. One intelligence.** A local, evidence-first visit-preparation demo with real GBrain memory. MIT licensed. All records concern one fictional patient, Jordan Taylor, in a clearly labeled **September 19, 2026 historical snapshot**. This is discussion support, not a diagnostic or treatment system.

## Run

Requires Node 24 and npm. The app needs no database service, model API, or deployment.

```sh
npm install
cp .env.example .env.local
# Configure the installed local GBrain CLI path, or a hosted connection below.
npm run dev
```

Open <http://127.0.0.1:3000>. The server binds to loopback. The root `.env.local`, `.data/` store, and generated reports are gitignored. If Node is supplied by a desktop application's bundled runtime without npm, install npm from the official npm registry and put both executables on PATH first. The repository itself does not rely on a machine-specific runtime path.

### GBrain

The verified demo uses **real local GBrain 0.59.0.0 via MCP stdio**, selected after the local installation became available. Set `GBRAIN_MODE=local` and `GBRAIN_BIN` to the absolute installed `gbrain` executable. Its sibling Bun executable is added to the child PATH. This uses your existing GBrain configuration/store. Only synthetic derived notes under `bibliotech/<demo-namespace>/` are written. Automatic background sweep is disabled for this client.

For hosted use, set `GBRAIN_MODE=hosted` and `GBRAIN_TOKEN` to a dedicated connection token with **Full** Memory permission at `https://gbrain.io/mcp`. The official MCP TypeScript client uses Streamable HTTP. Never use a `NEXT_PUBLIC_*` variable for the token. Restart the dev server after changing configuration. Hosted authentication/permissions remain **unverified**; local verification does not establish hosted compatibility.

```sh
npm run gbrain:inspect   # Actual tools/list; saves schemas under .data/
npm run gbrain:verify    # Real read, create, revision-safe update, fresh-client reread
```

No mock fallback exists in the application. Missing permissions, connection failure, and unverified writes are visible. Local-only analysis remains available with explicit unavailable/pending memory status. See [integration details](docs/gbrain.md).

## Demo

1. **Reset Demo**, then **Prepare My Visit**: three evidence-supported discussion items.
2. Open **View sources** and inspect the original FHIR.
3. Return to **Your priors** and **Import follow-up report**. Only the supplied [synthetic fixture](packages/demo-data/fixtures/followup-mammogram-2026-09.json) is accepted.
4. Inspect **Memory**: the same stable follow-up note becomes `resolved`, with the imported report's ID and source date. Failed writes remain pending with Retry.
5. **Fresh Session** clears the brief and recalled cache, keeps the namespace, and performs a new GBrain read. Prepare again: the follow-up question stays resolved.
6. Mark a measurement item reviewed, start a fresh session, and prepare again. The unchanged FHIR now produces a brief that remembers the review state.

Reset is development-only. It restores 27 FHIR resources (26 timeline events plus the patient) and creates a new namespace; old GBrain notes are retained. The imported report adds one resource.

## Validate

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run rehearse        # Running development server + configured real GBrain; writes demo notes
npm run test:e2e        # Running development server + local Chrome; UI smoke tests
```

Production build uses Next.js's webpack compiler because the bundled runtime's sandbox blocked a Turbopack CSS worker. The development server uses Turbopack. Tests use an explicitly identified in-memory double only inside the test suite; `rehearse` requires the real provider.

See [architecture and safety](docs/architecture.md), [QM integration](docs/qm.md), and [verification results](docs/verification.md). Live QM orchestration, a QM memory provider, arbitrary imports, optional LLM synthesis, deployment, and real patient use are deferred.
