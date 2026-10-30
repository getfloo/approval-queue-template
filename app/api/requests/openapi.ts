import { z } from "zod";
import { CATEGORIES, STATUSES } from "@/lib/request-fields";
import { DECIDE_SCOPE, DecisionInput, ListFilter, RequestInput } from "@/lib/requests";
import { ApiError, type Operation } from "@/lib/openapi";

const actorVia = z.enum(["app", "api"]).meta({ description: '"app" for a signed-in person, "api" for an app API key.' });

/** A request as the API returns it, including its decision once there is one. */
export const RequestJson = z.object({
  id: z.uuid(),
  title: z.string(),
  category: z.enum(CATEGORIES),
  amount: z.number().nullable(),
  justification: z.string(),
  status: z.enum(STATUSES),
  requestedById: z.string().meta({ description: "The user or API consumer that submitted the request." }),
  requestedByName: z.string(),
  requestedVia: actorVia,
  createdAt: z.iso.datetime(),
  decidedById: z.string().nullable().meta({ description: "The admin or API consumer that decided the request." }),
  decidedByName: z.string().nullable().meta({ description: 'The decider\'s name; an API consumer without a name shows as "api".' }),
  decidedVia: actorVia.nullable(),
  decidedAt: z.iso.datetime().nullable(),
  decisionComment: z.string().nullable(),
});

const decideNote = `Keys holding the "${DECIDE_SCOPE}" scope see every request; other keys see the requests they submitted.`;

// The contract for ./route.ts and ./[id]/decision/route.ts. Listed in
// app/api/operations.ts; the tests fail if a handler is missing here or a
// response stops matching.
export const operations: Operation[] = [
  {
    method: "get",
    path: "/api/requests",
    operationId: "listRequests",
    summary: `List requests, newest first. ${decideNote}`,
    query: ListFilter,
    responses: {
      200: { description: "The matching requests.", schema: z.object({ requests: z.array(RequestJson) }) },
      400: { description: "A filter value is not one of the allowed values.", schema: ApiError },
    },
  },
  {
    method: "post",
    path: "/api/requests",
    operationId: "createRequest",
    summary: "Submit a request on behalf of the key's consumer. It starts pending.",
    request: RequestInput,
    responses: {
      201: { description: "The created request.", schema: z.object({ request: RequestJson }) },
      400: { description: "The body is not JSON or a field is missing or invalid.", schema: ApiError },
    },
  },
  {
    method: "post",
    path: "/api/requests/{id}/decision",
    operationId: "decideRequest",
    summary: `Approve or reject a pending request. Requires a key holding the "${DECIDE_SCOPE}" scope; the key's consumer is recorded as the decider.`,
    request: DecisionInput,
    responses: {
      200: { description: "The decided request.", schema: z.object({ request: RequestJson }) },
      400: { description: "The body is not JSON, or a rejection has no comment.", schema: ApiError },
      403: { description: `The key does not hold the "api" scope (answered by the gateway) or the "${DECIDE_SCOPE}" scope.`, schema: ApiError },
      404: { description: "No request has this id.", schema: ApiError },
      409: { description: "The request was already decided; the body names its status.", schema: ApiError },
    },
  },
];
