// A liveness probe. It deliberately does not read or mutate the demo store.
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
