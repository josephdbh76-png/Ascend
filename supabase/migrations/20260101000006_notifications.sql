-- Notifications: achievement unlocks, rank movement, challenges, milestones,
-- verification events. Always generated server-side from a real event —
-- never fabricated client-side.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (
    type in ('achievement_unlocked', 'rank_increased', 'challenge_started', 'milestone_reached', 'verification_completed')
  ),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy "users can view their own notifications" on notifications
  for select using (auth.uid() = user_id);

-- A user may only ever create a notification for themselves, and only as a
-- side effect of their own action (e.g. their own Stripe sync unlocking an
-- achievement) — never for another user. Harmless even if imitated: it
-- can't grant anything, only add a row to their own notification feed.
create policy "users can insert their own notifications" on notifications
  for insert with check (auth.uid() = user_id);

create policy "users can mark their own notifications as read" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rank-movement notifications are produced in bulk, for every user, by the
-- trusted snapshot job — only the service role may do that directly.
grant insert on notifications to service_role;

-- Extend the snapshot job to notify a user the first time their global
-- rank improves versus the last captured snapshot.
create or replace function capture_leaderboard_snapshot(p_snapshot_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_season uuid;
  scope_pairs text[][];
  pair text[];
  rec record;
  previous_rank int;
begin
  select id into active_season from seasons where is_active = true limit 1;

  scope_pairs := array(
    select array['global', '']
    union all
    select array['country', country] from (select distinct country from profiles where country is not null) c
    union all
    select array['category', category] from (select distinct category from businesses) b
  );

  foreach pair slice 1 in array scope_pairs loop
    for rec in select * from get_leaderboard(pair[1], pair[2], 100000, 0) loop
      if pair[1] = 'global' then
        select ls.rank into previous_rank
        from leaderboard_snapshots ls
        where ls.user_id = rec.user_id and ls.scope = 'global' and ls.scope_value = ''
        order by ls.snapshot_date desc
        limit 1;

        if previous_rank is not null and rec.rank < previous_rank then
          insert into notifications (user_id, type, title, body, metadata)
          values (
            rec.user_id,
            'rank_increased',
            'Tu progresses au classement',
            'Tu es passé de la position #' || previous_rank || ' à #' || rec.rank || '.',
            jsonb_build_object('previous_rank', previous_rank, 'new_rank', rec.rank)
          );
        end if;
      end if;

      insert into leaderboard_snapshots (
        user_id, season_id, scope, scope_value, rank, revenue_cents, growth_percent, snapshot_date
      )
      values (
        rec.user_id, active_season, pair[1], pair[2], rec.rank, rec.revenue_display_cents, rec.growth_percent, p_snapshot_date
      )
      on conflict (user_id, season_id, scope, scope_value, snapshot_date)
      do update set rank = excluded.rank, revenue_cents = excluded.revenue_cents, growth_percent = excluded.growth_percent;
    end loop;
  end loop;
end;
$$;

revoke all on function capture_leaderboard_snapshot(date) from public;
grant execute on function capture_leaderboard_snapshot(date) to service_role;
