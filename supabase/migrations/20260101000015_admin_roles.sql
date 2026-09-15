-- Platform admins: full-trust operators who can manage any user's
-- subscription tier and promote/demote other admins. A boolean is enough
-- since every admin has identical rights (no hierarchy) — see the app's
-- admin server actions for the actual authorization checks, which always
-- go through the service-role client (subscriptions has no RLS policy
-- letting one user write another's row, by design).

alter table profiles add column is_admin boolean not null default false;
