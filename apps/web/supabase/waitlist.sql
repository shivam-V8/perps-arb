-- Run once in the Supabase SQL editor.
create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  ip_hash text,           -- sha256(ip + WAITLIST_SALT); raw IPs are never stored
  created_at timestamptz not null default now()
);

-- RLS on with NO policies: anon/authenticated roles can do nothing;
-- only the service-role key (server-side route handler) can touch it.
alter table public.waitlist_signups enable row level security;

create index waitlist_signups_ip_hash_created_idx
  on public.waitlist_signups (ip_hash, created_at);
