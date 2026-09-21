-- PayPal was already allowed by the original provider check (a
-- placeholder from day one that never had a real integration behind
-- it) — only Lemon Squeezy needs to be added now that both are real.
alter table revenue_sources drop constraint revenue_sources_provider_check;
alter table revenue_sources add constraint revenue_sources_provider_check
  check (provider in ('stripe', 'shopify', 'paypal', 'paddle', 'manual', 'bank', 'lemonsqueezy'));
