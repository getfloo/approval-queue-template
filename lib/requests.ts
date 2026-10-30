import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { requests } from "@/db/schema";
import type { Caller } from "@/lib/identity";
import { CATEGORIES, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH, STATUSES } from "@/lib/request-fields";

/** An app API key holding this scope (or "*") may see every request and decide them, like an admin. */
export const DECIDE_SCOPE = "approvals.decide";

/** Admins decide in the app; API keys decide only with the decide scope. The client never decides this. */
export function canDecide(caller: Caller): boolean {
  return caller.kind === "user"
    ? caller.role === "admin"
    : caller.scopes.includes(DECIDE_SCOPE) || caller.scopes.includes("*");
}

/** Who did something, as the audit trail shows it. An API consumer without a name shows as "api". */
function actorFrom(caller: Caller) {
  return caller.kind === "user"
    ? { id: caller.id, name: caller.name || caller.email, via: "app" }
    : { id: caller.id, name: caller.name || "api", via: "api" };
}

const text = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, { error: message }).max(max, { error: message });

// One schema validates the form action and POST /api/requests, and the OpenAPI
// document is generated from it, so the three cannot drift.
export const RequestInput = z.object({
  title: text(MAX_TITLE_LENGTH, `Give the request a title up to ${MAX_TITLE_LENGTH} characters.`)
    .meta({ description: "What is being asked for, in one line." }),
  category: z.enum(CATEGORIES, { error: "Pick a category." }),
  amount: z.number({ error: "Enter the amount as a number, or leave it blank." })
    .nonnegative({ error: "The amount cannot be negative." })
    .max(9_999_999_999, { error: "The amount is too large." })
    .optional()
    .meta({ description: "Optional. Money, days, seats: whatever the request is measured in. Stored to 2 decimals." }),
  justification: text(MAX_TEXT_LENGTH, `Explain why, in up to ${MAX_TEXT_LENGTH.toLocaleString("en-US")} characters.`)
    .meta({ description: "Why this should be approved." }),
});

export const DecisionInput = z.object({
  decision: z.enum(["approved", "rejected"], { error: 'Choose "approved" or "rejected".' }),
  comment: z.string().trim().max(MAX_TEXT_LENGTH, { error: "The comment is too long." }).default("")
    .meta({ description: "Shown to the requester. Required when rejecting." }),
}).refine((input) => input.decision === "approved" || input.comment.length > 0, {
  error: "Say why the request is rejected.",
  path: ["comment"],
});

export const ListFilter = z.object({
  status: z.enum(STATUSES).optional().meta({ description: "Only requests with this status." }),
  category: z.enum(CATEGORIES).optional().meta({ description: "Only requests in this category." }),
});

/** Thrown for input the caller can fix; the API answers it with 400, the form shows it. */
export class InvalidInput extends Error {}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidInput(parsed.error.issues[0].message);
  }
  return parsed.data;
}

export type ApprovalRequest = typeof requests.$inferSelect;

/**
 * Requests newest first. "visible" is everything for deciders and their own for
 * everyone else; "own" is only the caller's, for deciders too.
 */
export async function listRequests(
  caller: Caller,
  filter: z.infer<typeof ListFilter> = {},
  scope: "visible" | "own" = "visible",
): Promise<ApprovalRequest[]> {
  const conditions: SQL[] = [];
  if (scope === "own" || !canDecide(caller)) conditions.push(eq(requests.requestedById, caller.id));
  if (filter.status) conditions.push(eq(requests.status, filter.status));
  if (filter.category) conditions.push(eq(requests.category, filter.category));
  return getDb().select().from(requests).where(and(...conditions)).orderBy(desc(requests.createdAt));
}

/** One request, or null when it does not exist or belongs to someone else and the caller cannot decide. */
export async function getRequest(caller: Caller, id: string): Promise<ApprovalRequest | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const [request] = await getDb().select().from(requests).where(eq(requests.id, id));
  if (!request || (!canDecide(caller) && request.requestedById !== caller.id)) return null;
  return request;
}

export async function createRequest(caller: Caller, input: z.infer<typeof RequestInput>): Promise<ApprovalRequest> {
  const actor = actorFrom(caller);
  const [request] = await getDb().insert(requests).values({
    ...input,
    requestedById: actor.id,
    requestedByName: actor.name,
    requestedVia: actor.via,
  }).returning();
  return request;
}

/**
 * Records a decision on a pending request. The update only matches a pending row,
 * so two deciders racing cannot both win. Returns null when the request does not
 * exist, and the unchanged request with alreadyDecided when it was decided before.
 * Callers check canDecide first.
 */
export async function decideRequest(
  caller: Caller,
  id: string,
  input: z.infer<typeof DecisionInput>,
): Promise<{ request: ApprovalRequest; alreadyDecided: boolean } | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const actor = actorFrom(caller);
  const [decided] = await getDb().update(requests).set({
    status: input.decision,
    decidedById: actor.id,
    decidedByName: actor.name,
    decidedVia: actor.via,
    decidedAt: new Date(),
    decisionComment: input.comment || null,
  }).where(and(eq(requests.id, id), eq(requests.status, "pending"))).returning();
  if (decided) return { request: decided, alreadyDecided: false };
  const [existing] = await getDb().select().from(requests).where(eq(requests.id, id));
  return existing ? { request: existing, alreadyDecided: true } : null;
}
