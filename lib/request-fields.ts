// The values a request can take, shared by server code and the client-side forms.
// Server-only logic (validation, queries, permissions) is in lib/requests.ts.

export const CATEGORIES = ["discount", "purchase", "access", "time_off", "other"] as const;
export const STATUSES = ["pending", "approved", "rejected"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  discount: "Discount",
  purchase: "Purchase",
  access: "Access",
  time_off: "Time off",
  other: "Other",
};

export const MAX_TITLE_LENGTH = 200;
export const MAX_TEXT_LENGTH = 5000;
