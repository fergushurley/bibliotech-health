import { workflow, safeError } from "../../../../../packages/core/src/workflow";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && (!host || new URL(origin).host !== host))
    return Response.json(
      { error: "Cross-origin mutations are not allowed." },
      { status: 403 },
    );
  try {
    const { action, id } = await request.json();
    let result;
    switch (action) {
      case "prepare":
        result = await workflow.prepareVisit();
        break;
      case "import":
        result = await workflow.importFollowUp();
        break;
      case "retry":
        result = await workflow.retryMemory();
        break;
      case "recall":
        result = await workflow.recallMemory();
        break;
      case "review":
        result = await workflow.markReviewed(id);
        break;
      case "fresh":
        result = await workflow.freshSession();
        break;
      case "reset":
        result = await workflow.resetDemo();
        break;
      case "deny":
        result = await workflow.denyResearch();
        break;
      default:
        return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: safeError(error) }, { status: 400 });
  }
}
