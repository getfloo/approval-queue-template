CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(12, 2),
	"justification" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by_id" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by_id" text,
	"decided_by_name" text,
	"decided_via" text,
	"decided_at" timestamp with time zone,
	"decision_comment" text
);
--> statement-breakpoint
CREATE INDEX "requests_status_created_at_idx" ON "requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "requests_requested_by_id_created_at_idx" ON "requests" USING btree ("requested_by_id","created_at");