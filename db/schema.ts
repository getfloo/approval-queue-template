import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** People who have signed in, synced from the gateway on every page load. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// requested_by_id and decided_by_id are whatever id the gateway asserted: a
// user's id from a page, or an API consumer's id from /api. They are not foreign
// keys to users because a key caller is not a user. Names are copied at the time
// of the action so the audit trail reads the same after someone is renamed.
// A request is decided once: status moves from pending to approved or rejected.
export const requests = pgTable("requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }),
  justification: text("justification").notNull(),
  status: text("status").notNull().default("pending"),
  requestedById: text("requested_by_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedVia: text("requested_via").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  decidedById: text("decided_by_id"),
  decidedByName: text("decided_by_name"),
  decidedVia: text("decided_via"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decisionComment: text("decision_comment"),
}, (table) => [
  index("requests_status_created_at_idx").on(table.status, table.createdAt),
  index("requests_requested_by_id_created_at_idx").on(table.requestedById, table.createdAt),
]);
