import { store } from "../../../../../packages/core/src/store";
import { loadToken } from "../../../../../packages/core/src/workflow";
import {
  normalizePatient,
  normalizeRecords,
  evidenceFor,
} from "../../../../../packages/fhir/src/index";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const state = await store.read();
  return Response.json(
    {
      ...state,
      resources: undefined,
      patient: normalizePatient(
        state.resources.find((r) => r.resourceType === "Patient")!,
      ),
      events: normalizeRecords(state.resources),
      evidence: evidenceFor(state.resources),
      tokenConfigured: !!loadToken() || process.env.GBRAIN_MODE === "local",
      development: process.env.NODE_ENV !== "production",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
