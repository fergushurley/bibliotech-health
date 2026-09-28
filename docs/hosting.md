# Public deployment at www.biblio.tech

The application is prepared for Cloudflare Workers in account
`6d48d907ee652c28c865d520b3dab883`. The Worker is named `bibliotech-health` and
its custom domain is `www.biblio.tech`. The domain already uses Cloudflare DNS.
No deployment or DNS change has been made yet: Cloudflare's GitHub connection
requires the owner's approval.

## Public runtime

The UI uses Cloudflare's vinext adapter alongside the existing Next.js setup.
The Worker sends `/api/*` requests to the public API before handing page requests
to vinext. Each browser gets a cryptographically random session cookie with
`HttpOnly`, `Secure`, `SameSite=Lax`, and a 24-hour lifetime. That cookie maps to
one SQLite-backed Durable Object. Visitors cannot overwrite one another's demo
state. A storage alarm deletes the session after 24 hours, and the API is never
cached. Demo resets affect only the current browser.

Only the repository's fictional patient and supplied follow-up fixture are used.
There is no real-record upload or patient account support. Recent activity is
bounded to 100 access events and 10 runs. Mutations require same-origin JSON
requests, have a 1 KiB body limit, and allow 30 actions per minute per session.
Cloudflare's free-tier limits still apply; session rate limiting is not a global
anti-abuse quota.

The public build excludes the local `.env.local`, filesystem store, GBrain binary
and local GBrain store. Visit preparation works without GBrain, with explicit
unavailable/pending memory status. To enable live memory later, add a dedicated
`GBRAIN_TOKEN` Worker secret and verify the hosted connection. Never place it in
Wrangler `vars`, Git, build arguments, or a `NEXT_PUBLIC_*` variable. Expiration or
reset of a demo session does not delete notes already written to GBrain.

## Commands

Use Node.js 24 and npm from the repository root:

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run build:cloudflare
npm run preview:cloudflare
```

The preview uses Cloudflare's local runtime and local Durable Object storage.
After deployment credentials are available:

```sh
npm run deploy:cloudflare
```

Deployment uses `apps/web/dist/server/wrangler.json`, generated from the checked-in
`apps/web/wrangler.jsonc`. Wrangler creates the SQLite Durable Object namespace and
connects the custom domain. No guessed CNAME target is needed. The existing apex
`biblio.tech` and unrelated/email records should remain unchanged.

## GitHub-connected Cloudflare build

In **Workers & Pages → Create application → Continue with GitHub**, select only
`fergushurley/bibliotech-health` if the integration asks for repository access.

| Setting | Value |
| --- | --- |
| Worker name | `bibliotech-health` |
| Repository | `fergushurley/bibliotech-health` |
| Production branch | `codex/cloudflare-public` |
| Root directory | Repository root (`/`) |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Build environment | `NODE_VERSION=24` |
| Custom domain | `www.biblio.tech` (defined in Wrangler config) |

Do not add a hosted GBrain token to the build environment. It belongs in the
Worker's runtime secrets. After deployment, verify HTTPS, `/api/health`, browser
navigation, two independent sessions, visit preparation, and fixture import on
both the generated Worker URL and the custom domain.

## Local Node and container alternative

`npm run dev` continues to use the local JSON store and existing GBrain setup.
The optional Dockerfile builds standalone Next.js for a single Node process:

```sh
docker build -t bibliotech-health .
docker volume create bibliotech-health-data
docker run --rm --name bibliotech-health \
  -p 127.0.0.1:3000:3000 \
  --mount source=bibliotech-health-data,target=/data \
  bibliotech-health
```

The container needs a writable persistent volume (UID 1000) at
`BIBLIOTECH_DATA_DIR=/data`. It retains shared single-process state and must stay
private or behind an access gate; use the Cloudflare build for the public demo.
Docker is not installed on the development machine, so the image itself has not
been built or run. The underlying standalone Next.js output was separately tested.

References: [Cloudflare Next.js deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/),
[Durable Object storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/),
and [Durable Objects free-tier availability and limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).
