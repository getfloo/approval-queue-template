import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => { throw new Error("tests never open a database"); } }));
vi.mock("@/lib/requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/requests")>()),
  listRequests: vi.fn(),
  createRequest: vi.fn(),
  decideRequest: vi.fn(),
}));

import { POST as decidePost } from "../app/api/requests/[id]/decision/route";
import { operations } from "../app/api/requests/openapi";
import { GET, POST } from "../app/api/requests/route";
import type { Operation } from "../lib/openapi";
import { canDecide, createRequest, decideRequest, listRequests, type ApprovalRequest } from "../lib/requests";

const keyHeaders = (scopes: string) => ({
  "X-Floo-Auth-Method": "api_key",
  "X-Floo-Api-Consumer-Id": "consumer-9",
  "X-Floo-Api-Consumer-Name": "ops-agent",
  "X-Floo-Api-Key-Id": "key-42",
  "X-Floo-Api-Key-Scopes": scopes,
});

const pending: ApprovalRequest = {
  id: "0b8f3c2e-6a1d-4f5b-9c7e-2d4a6b8c0e1f",
  title: "New laptop",
  category: "purchase",
  amount: 1499.5,
  justification: "Current one is five years old.",
  status: "pending",
  requestedById: "consumer-9",
  requestedByName: "ops-agent",
  requestedVia: "api",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  decidedById: null,
  decidedByName: null,
  decidedVia: null,
  decidedAt: null,
  decisionComment: null,
};
const approved: ApprovalRequest = {
  ...pending,
  status: "approved",
  decidedById: "consumer-9",
  decidedByName: "ops-agent",
  decidedVia: "api",
  decidedAt: new Date("2026-01-02T00:00:00Z"),
  decisionComment: "ok",
};

// Every response a handler gives must match what the OpenAPI document declares.
async function expectDocumented(operationId: string, response: Response): Promise<unknown> {
  const operation = operations.find((candidate: Operation) => candidate.operationId === operationId);
  const declared = operation?.responses[response.status];
  expect(declared?.schema, `${operationId} ${response.status} is not documented`).toBeDefined();
  const body: unknown = await response.json();
  declared?.schema?.parse(body);
  return body;
}

beforeEach(() => vi.clearAllMocks());

describe("canDecide", () => {
  const user = (role: string) => ({ kind: "user" as const, id: "u", email: "u@example.com", name: "", role });
  const key = (scopes: string[]) => ({ kind: "api_key" as const, id: "c", name: "", keyId: "k", scopes });

  it("lets admins decide and nobody else signed in", () => {
    expect(canDecide(user("admin"))).toBe(true);
    expect(canDecide(user("member"))).toBe(false);
  });

  it("lets a key decide only with the approvals.decide or wildcard scope", () => {
    expect(canDecide(key(["api"]))).toBe(false);
    expect(canDecide(key(["api", "approvals.decide"]))).toBe(true);
    expect(canDecide(key(["*"]))).toBe(true);
  });
});

describe("GET /api/requests", () => {
  it("lists requests with the status and category filters", async () => {
    vi.mocked(listRequests).mockResolvedValue([pending]);
    const response = await GET(new Request("http://app/api/requests?status=pending&category=purchase", { headers: keyHeaders("api") }));
    expect(response.status).toBe(200);
    expect(await expectDocumented("listRequests", response)).toEqual({
      requests: [{ ...pending, createdAt: pending.createdAt.toISOString() }],
    });
    expect(listRequests).toHaveBeenCalledWith(expect.objectContaining({ id: "consumer-9" }), { status: "pending", category: "purchase" });
  });

  it("answers an unknown status with 400", async () => {
    const response = await GET(new Request("http://app/api/requests?status=maybe", { headers: keyHeaders("api") }));
    expect(response.status).toBe(400);
    await expectDocumented("listRequests", response);
    expect(listRequests).not.toHaveBeenCalled();
  });

  it("refuses a request that did not come through the gateway", async () => {
    await expect(GET(new Request("http://app/api/requests"))).rejects.toThrow("did not come through the floo gateway");
  });
});

describe("POST /api/requests", () => {
  const post = (body: BodyInit) =>
    POST(new Request("http://app/api/requests", { method: "POST", headers: keyHeaders("api"), body }));

  it("creates a request for the key consumer", async () => {
    vi.mocked(createRequest).mockResolvedValue(pending);
    const response = await post(JSON.stringify({
      title: " New laptop ", category: "purchase", amount: 1499.5, justification: "Current one is five years old.",
    }));
    expect(response.status).toBe(201);
    await expectDocumented("createRequest", response);
    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "api_key", id: "consumer-9" }),
      { title: "New laptop", category: "purchase", amount: 1499.5, justification: "Current one is five years old." },
    );
  });

  it("answers an invalid category with 400 and the message the form shows", async () => {
    const response = await post(JSON.stringify({ title: "x", category: "lunch", justification: "y" }));
    expect(response.status).toBe(400);
    expect(await expectDocumented("createRequest", response)).toEqual({ error: "Pick a category." });
    expect(createRequest).not.toHaveBeenCalled();
  });

  it.each([["not JSON", "not json"], ["JSON that is not an object", '"hello"']])("answers %s with 400", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    await expectDocumented("createRequest", response);
    expect(createRequest).not.toHaveBeenCalled();
  });
});

describe("POST /api/requests/{id}/decision", () => {
  const decide = (scopes: string, body: unknown) =>
    decidePost(
      new Request(`http://app/api/requests/${pending.id}/decision`, { method: "POST", headers: keyHeaders(scopes), body: JSON.stringify(body) }),
      { params: Promise.resolve({ id: pending.id }) },
    );

  it("refuses a key without the approvals.decide scope", async () => {
    const response = await decide("api", { decision: "approved" });
    expect(response.status).toBe(403);
    await expectDocumented("decideRequest", response);
    expect(decideRequest).not.toHaveBeenCalled();
  });

  it("records the key consumer as the decider", async () => {
    vi.mocked(decideRequest).mockResolvedValue({ request: approved, alreadyDecided: false });
    const response = await decide("api,approvals.decide", { decision: "approved", comment: " ok " });
    expect(response.status).toBe(200);
    await expectDocumented("decideRequest", response);
    expect(decideRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "api_key", id: "consumer-9", name: "ops-agent" }),
      pending.id,
      { decision: "approved", comment: "ok" },
    );
  });

  it("requires a comment to reject", async () => {
    const response = await decide("api,approvals.decide", { decision: "rejected" });
    expect(response.status).toBe(400);
    expect(await expectDocumented("decideRequest", response)).toEqual({ error: "Say why the request is rejected." });
    expect(decideRequest).not.toHaveBeenCalled();
  });

  it("answers an unknown request with 404", async () => {
    vi.mocked(decideRequest).mockResolvedValue(null);
    const response = await decide("api,approvals.decide", { decision: "approved" });
    expect(response.status).toBe(404);
    await expectDocumented("decideRequest", response);
  });

  it("answers a request that was already decided with 409", async () => {
    vi.mocked(decideRequest).mockResolvedValue({ request: approved, alreadyDecided: true });
    const response = await decide("api,approvals.decide", { decision: "rejected", comment: "no" });
    expect(response.status).toBe(409);
    expect(await expectDocumented("decideRequest", response)).toEqual({ error: "This request was already approved." });
  });
});
