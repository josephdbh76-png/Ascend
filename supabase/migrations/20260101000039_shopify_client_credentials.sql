-- Shopify's Dev Dashboard apps (the only install path that works without
-- either a Shopify Plus organization or a full App Store review) no longer
-- expose a long-lived Admin API access token in the UI at all — since
-- January 2026, they issue tokens via the OAuth "client credentials
-- grant": exchange the app's client_id + client_secret for a fresh access
-- token (good for 24h) whenever one is needed, rather than storing one
-- token forever. provider_credentials must hold the exchangeable pair
-- instead of a token — this table has never held a real row yet (no
-- Shopify connection has ever succeeded in production), so this is a
-- plain column swap, not a data migration.

alter table provider_credentials rename column access_token to client_secret;
alter table provider_credentials add column client_id text not null default '';
alter table provider_credentials alter column client_id drop default;
