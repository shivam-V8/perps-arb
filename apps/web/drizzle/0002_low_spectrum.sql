CREATE TABLE "company_boards" (
	"ats" text NOT NULL,
	"token" text NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"last_ok_at" timestamp with time zone,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_boards_ats_token_pk" PRIMARY KEY("ats","token")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "job_results" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job_results" ADD COLUMN "ats" text;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_boards_company_idx" ON "company_boards" USING btree ("company");--> statement-breakpoint
CREATE INDEX "usage_events_lookup_idx" ON "usage_events" USING btree ("user_id","kind","at");