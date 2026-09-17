-- Tracks whether a member has seen the animated product tour, so it shows
-- exactly once (dismissible early) rather than on every dashboard visit.
-- DB-backed rather than localStorage so it persists across devices.

alter table profiles add column has_seen_tutorial boolean not null default false;
