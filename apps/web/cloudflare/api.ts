export interface Env {
  DEMO_SESSIONS: DurableObjectNamespace;
  GBRAIN_TOKEN?: string;
}

const COOKIE = "__Host-bibliotech-demo";
export const SESSION_SECONDS = 24 * 60 * 60;

export function apiJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function sessionCookie(request: Request) {
  const values = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${COOKIE}=`));
  const token = values.length === 1 ? values[0].slice(COOKIE.length + 1) : "";
  return /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}

export async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health" && request.method === "GET")
    return apiJson({ status: "ok" });

  const stateRequest =
    url.pathname === "/api/state" && request.method === "GET";
  const actionRequest =
    url.pathname === "/api/actions" && request.method === "POST";
  if (!stateRequest && !actionRequest)
    return apiJson({ error: "Not found." }, 404);

  if (request.headers.get("sec-fetch-site") === "cross-site")
    return apiJson({ error: "Cross-site requests are not allowed." }, 403);
  if (actionRequest) {
    if (request.headers.get("origin") !== url.origin)
      return apiJson({ error: "Cross-origin mutations are not allowed." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return apiJson({ error: "Expected application/json." }, 415);
  }

  let token = sessionCookie(request);
  const isNew = !token;
  if (isNew && actionRequest)
    return apiJson(
      { error: "Reload the page to start your demo session." },
      401,
    );
  if (!token) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const session = env.DEMO_SESSIONS.get(env.DEMO_SESSIONS.idFromName(token));
  const result = await session.fetch(request);
  const headers = new Headers(result.headers);
  headers.set("Cache-Control", "private, no-store");
  if (isNew)
    headers.set(
      "Set-Cookie",
      `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
    );
  return new Response(result.body, { status: result.status, headers });
}
