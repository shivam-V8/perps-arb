CREATE TABLE "candidate_swipes" (
	"role_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_swipes_role_id_candidate_id_pk" PRIMARY KEY("role_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"education" text[] DEFAULT '{}'::text[] NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"remote_pref" text DEFAULT 'any' NOT NULL,
	"seniority" text DEFAULT 'mid' NOT NULL,
	"salary_min" integer,
	"salary_currency" text DEFAULT 'USD' NOT NULL,
	"visible_to_recruiters" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_leads" (
	"candidate_id" uuid NOT NULL,
	"name" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	CONSTRAINT "company_leads_candidate_id_name_pk" PRIMARY KEY("candidate_id","name")
);
--> statement-breakpoint
CREATE TABLE "job_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"remote" text DEFAULT 'unknown' NOT NULL,
	"url" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"posted" text DEFAULT '' NOT NULL,
	"salary" text,
	"summary" text DEFAULT '' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"decision" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_results_candidate_url" UNIQUE("candidate_id","url")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_role_candidate" UNIQUE("role_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"must_have" text[] DEFAULT '{}'::text[] NOT NULL,
	"nice_to_have" text[] DEFAULT '{}'::text[] NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"remote" text DEFAULT 'any' NOT NULL,
	"seniority" text DEFAULT 'mid' NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_swipes" ADD CONSTRAINT "candidate_swipes_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_swipes" ADD CONSTRAINT "candidate_swipes_candidate_id_candidates_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_leads" ADD CONSTRAINT "company_leads_candidate_id_candidates_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_results" ADD CONSTRAINT "job_results_candidate_id_candidates_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_candidate_id_candidates_user_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_match_idx" ON "messages" USING btree ("match_id","created_at");