-- Basic abuse protection for login/signup — no policies at all, since
-- only the service role ever touches this (matches the same
-- zero-policy-table pattern used for provider_credentials): a plain
-- log of attempts, checked and pruned by checkRateLimit().
create table rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx on rate_limit_attempts (identifier, action, created_at desc);

alter table rate_limit_attempts enable row level security;
