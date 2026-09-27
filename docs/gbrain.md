# GBrain contract

The app inspects live `tools/list` and rejects unknown argument names or missing required arguments before calls. The installed local server was verified directly; public docs alone are not treated as proof of hosted schemas.

| Internal operation | Verified local MCP operations                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| search             | `search({query})`, followed by `fetch({id})` using unchanged result IDs                         |
| get                | `get_page({slug, include_content:true})`                                                        |
| remember           | read canonical page, then `put_page({slug,content,request_id,expected_revision?})`, then reread |
| resolve            | same revision-safe update at the same stable key, lifecycle `resolved`, then reread             |

Search returns a JSON text content block followed by a separate explanatory text block. The parser reads the JSON block. With embeddings disabled in the local installation, keyword retrieval remains real and sufficient for exact demo namespace tokens. The connection does not invoke paid synthesis.

For an existing page, the adapter edits only its owned `bibliotech` section and preserves the surrounding canonical markdown. An update requires the returned revision and advertised `expected_revision` support. Unknown or non-owned content is not overwritten. A write that cannot be reread remains pending. Retrying reads the current canonical revision first; reset creates another namespace rather than deleting notes.

Hosted setup follows [GBrain's assistant connection documentation](https://gbrain.io/docs/tools/assistants): create a dedicated connection in the intended workspace, enable Full Memory permission, and save its token in root `.env.local`. The MCP endpoint is fixed at `https://gbrain.io/mcp`; redirects and insufficient-scope escalation are refused. Hosted compatibility must be established by running inspect and verify with that actual token. It is not established by the successful local stdio run.

The local stdio client runs as the local user and therefore does not prove OAuth/bearer-token permission enforcement. Unit tests cover refused writes and connection failures without fake success indicators. For a live hosted permission test, use a separately provisioned read-only demo connection and confirm pending status on attempted save; do not weaken an existing connection's permissions for this test.
