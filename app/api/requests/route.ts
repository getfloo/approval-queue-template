import { callerFrom } from "@/lib/identity";
import { InvalidInput, ListFilter, RequestInput, createRequest, listRequests, parse } from "@/lib/requests";

// The gateway serves /api only to callers holding an app API key with the "api"
// scope ([[routes]] in floo.app.toml) and has already verified the key. The
// contract is in ./openapi.ts.

export async function GET(request: Request): Promise<Response> {
  const caller = callerFrom(request.headers);
  const query = Object.fromEntries(new URL(request.url).searchParams);
  try {
    return Response.json({ requests: await listRequests(caller, parse(ListFilter, query)) });
  } catch (error) {
    if (error instanceof InvalidInput) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  const caller = callerFrom(request.headers);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"title": "...", "category": "purchase", "justification": "..."}.' }, { status: 400 });
  }
  try {
    return Response.json({ request: await createRequest(caller, parse(RequestInput, input)) }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidInput) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
