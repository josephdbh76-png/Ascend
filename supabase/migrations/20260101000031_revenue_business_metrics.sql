-- Stripe's charges.list already returns amount AND customer per charge —
-- the sync loop was only summing amounts and throwing the rest away. No
-- new API calls needed to also track unique customers and transaction
-- count per month, which is what the dashboard needs for "clients" and
-- "panier moyen" beyond the raw revenue figure.

alter table revenue_snapshots add column transaction_count int;
alter table revenue_snapshots add column customer_count int;
