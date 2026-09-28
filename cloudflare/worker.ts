import app from "vinext/server/fetch-handler";
import { handleApi, type Env } from "./api";
export { DemoSession, HealthDemoSession } from "./session";

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const url = new URL(request.url);
    const publicHostname =
      url.hostname === "www.biblio.tech" ||
      url.hostname.endsWith(".workers.dev");
    if (
      url.hostname === "biblio.tech" ||
      (publicHostname && url.protocol === "http:")
    ) {
      if (url.hostname === "biblio.tech") url.hostname = "www.biblio.tech";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || /^\/(priors|brief|agents|memory|access|insights)(\/|$)/.test(url.pathname)) {
        url.pathname = url.pathname === "/" ? "/health" : `/health${url.pathname}`;
        return Response.redirect(url.toString(), 308);
      }
    }
    const response = url.pathname.startsWith("/health/api/") || url.pathname.startsWith("/api/")
      ? await handleApi(request, env)
      : await app.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-BiblioTech-Version", "alternative");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
