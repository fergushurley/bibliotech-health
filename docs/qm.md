# Independent Health Priors QM skill

The extension lives at `extensions/qm/skills/health-priors/SKILL.md`. It uses the same workflow through `npm run health-priors -- prepare`, and has no QM dependency in the consumer UI.

Copy that skill folder into a QM deployment's `sandbox/skills/health-priors/`. Provision this repository, Node 24, npm dependencies and the chosen GBrain connection on the **QM agent computer**. Set `BIBLIOTECH_ROOT` to its absolute checkout path. A Mac-local GBrain executable path does not work inside a remote sandbox. Use QM's approved secret routing for hosted credentials; never commit them to the deployment.

This layout and its `name`/`description` frontmatter follow the [QM deployment directory contract](https://github.com/yc-software/qm/blob/main/docs/deploy-directory.md). Static skill validation and the shared local CLI can be checked without QM. Live QM execution is **pending** because no live QM instance was provided.

A generic QM memory provider is deferred. The [QM provider contract](https://github.com/yc-software/qm/blob/main/docs/memory-providers.md) uses OAuth client credentials; a GBrain connection bearer token is not sufficient to claim that bridge works.
