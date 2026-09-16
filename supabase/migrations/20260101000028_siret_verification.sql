-- Business identity verification via the free, public French government
-- registry (recherche-entreprises.api.gouv.fr) — no API key, no cost.
-- Independent of revenue verification: a member can be SIRET-verified,
-- revenue-verified, both, or neither.

alter table businesses add column siret text check (siret ~ '^[0-9]{14}$');
alter table businesses add column legal_name text;
alter table businesses add column siret_verified_at timestamptz;
