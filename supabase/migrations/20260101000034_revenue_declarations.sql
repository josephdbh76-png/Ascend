-- The previous design stored one manual declaration per (user_id, period)
-- directly on revenue_snapshots — submitting a second contract for the
-- same month silently overwrote the first instead of adding to it. Real
-- entrepreneurs often have several income sources (several contracts,
-- several clients) to declare for the same month.
--
-- revenue_declarations now holds one row per individual declaration, each
-- reviewed independently. The user_id/period aggregate in revenue_snapshots
-- becomes a computed sum of the *approved* declarations for that period —
-- recomputed by the app every time a declaration is submitted or reviewed
-- (see recomputeManualSnapshot in revenue.service.ts) — so a pending or
-- rejected entry never inflates what counts as "Vérifié".

create table revenue_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  period date not null,
  label text,
  amount_cents bigint not null check (amount_cents > 0),
  proof_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index revenue_declarations_user_period_idx on revenue_declarations (user_id, period desc);
create index revenue_declarations_pending_idx on revenue_declarations (review_status) where review_status = 'pending';

alter table revenue_declarations enable row level security;

create policy "users can view their own revenue declarations" on revenue_declarations
  for select using (auth.uid() = user_id);

create policy "users can create their own revenue declarations" on revenue_declarations
  for insert with check (auth.uid() = user_id);

create trigger revenue_declarations_set_updated_at before update on revenue_declarations
  for each row execute function set_updated_at();

-- Carry forward any declaration made under the old single-entry design
-- before dropping the columns it lived in, so it isn't silently lost.
insert into revenue_declarations (user_id, period, amount_cents, proof_path, review_status, reviewed_at, reviewed_by, rejection_reason, created_at)
select user_id, period, amount_cents, proof_path, review_status, reviewed_at, reviewed_by, rejection_reason, created_at
from revenue_snapshots
where review_status is not null and proof_path is not null;

-- A pending declaration was never meant to count as revenue under the new
-- model (only approved ones do, via recomputeManualSnapshot) — the old
-- design showed it right away, which the row above corrects going forward.
delete from revenue_snapshots where review_status = 'pending';

-- The per-snapshot review columns from the previous single-entry design
-- are superseded by revenue_declarations above.
alter table revenue_snapshots drop column review_status;
alter table revenue_snapshots drop column reviewed_at;
alter table revenue_snapshots drop column reviewed_by;
alter table revenue_snapshots drop column rejection_reason;
alter table revenue_snapshots drop column proof_path;
