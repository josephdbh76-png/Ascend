-- Replaces the single link_url with a configurable list of real buttons
-- per banner — each either a link (navigates somewhere) or a copyable
-- promo code (click-to-copy, no navigation). Empty array = no buttons,
-- just the image, same as before.
alter table dashboard_banners add column buttons jsonb not null default '[]'::jsonb;
alter table dashboard_banners drop column link_url;
