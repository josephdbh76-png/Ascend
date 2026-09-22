-- The discount percentage and lifetime-vs-once duration were hardcoded
-- (10% forever) when the influencer program shipped — now configurable
-- per influencer, since different creators warrant different deals.
alter table influencers add column discount_percent numeric not null default 10;
alter table influencers add column duration text not null default 'forever' check (duration in ('forever', 'once'));
