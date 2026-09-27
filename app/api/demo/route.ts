import { NextRequest, NextResponse } from "next/server";
import {
  freshSession,
  getState,
  importFollowup,
  prepareBrief,
  resetDemo,
  syncMemory,
  type Progress,
} from "@/lib/workflow";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await getState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to read demo state. Check the local data file." },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  if (
    request.headers.get("origin") !==
    `${request.nextUrl.protocol}//${request.headers.get("host")}`
  )
    return NextResponse.json(
      { error: "Same-origin requests only." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "JSON required." }, { status: 415 });
  try {
    const body = await request.json();
    if (body.action === "prepare" || body.action === "import") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: Progress) =>
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          try {
            if (body.action === "prepare") await prepareBrief(emit);
            else await importFollowup(body.record, emit);
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Operation failed.",
                }) + "\n",
              ),
            );
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      });
    }
    if (body.action === "fresh") return NextResponse.json(await freshSession());
    if (body.action === "reset")
      return NextResponse.json(await resetDemo(body.resetGBrain === true));
    if (body.action === "check") return NextResponse.json(await getState());
    if (body.action === "sync") return NextResponse.json(await syncMemory());
    return NextResponse.json(
      { error: "Unknown demo action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the operation.",
      },
      { status: 400 },
    );
  }
}
