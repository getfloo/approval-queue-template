import { callerFrom } from "@/lib/identity";
import { DECIDE_SCOPE, DecisionInput, InvalidInput, canDecide, decideRequest, parse } from "@/lib/requests";

// The gateway admits any key with the "api" scope; deciding also needs the
// approvals.decide scope on the key, checked here. The contract is in ../../openapi.ts.

export async function POST(request: Request, { params }: RouteContext<"/api/requests/[id]/decision">): Promise<Response> {
  const caller = callerFrom(request.headers);
  if (!canDecide(caller)) {
    return Response.json({ error: `This key cannot decide requests. Create one with --scope api --scope ${DECIDE_SCOPE}.` }, { status: 403 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"decision": "approved", "comment": "..."}.' }, { status: 400 });
  }
  try {
    const result = await decideRequest(caller, (await params).id, parse(DecisionInput, input));
    if (!result) return Response.json({ error: "No request has this id." }, { status: 404 });
    if (result.alreadyDecided) {
      return Response.json({ error: `This request was already ${result.request.status}.` }, { status: 409 });
    }
    return Response.json({ request: result.request });
  } catch (error) {
    if (error instanceof InvalidInput) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
