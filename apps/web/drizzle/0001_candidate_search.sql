-- Full-text search over candidate profiles. array_to_string isn't IMMUTABLE, so it's
-- wrapped in a function declared immutable (safe: same inputs always give the same text).
CREATE OR REPLACE FUNCTION cm_candidate_doc(headline text, summary text, skills text[])
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT to_tsvector('english'::regconfig, coalesce(headline, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(array_to_string(skills, ' '), ''))
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_search_idx" ON "candidates" USING gin (cm_candidate_doc("headline", "summary", "skills"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_fields_idx" ON "candidates" USING gin ("fields");
