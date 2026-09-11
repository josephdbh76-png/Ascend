-- Static product catalog: achievements, trophies, the current season and
-- its challenges. This is real product configuration, not demo data.

insert into achievements (id, name, description, icon, rarity, criteria) values
  ('first-verified-revenue', 'First Verified Revenue', 'Connected and verified your first revenue source.', 'check-circle', 'common', '{"type":"verification"}'),
  ('revenue-1k', '€1K Month', 'Reached €1,000 in monthly revenue.', 'trending-up', 'common', '{"type":"revenue_threshold","cents":100000}'),
  ('revenue-5k', '€5K Month', 'Reached €5,000 in monthly revenue.', 'trending-up', 'common', '{"type":"revenue_threshold","cents":500000}'),
  ('revenue-10k', '€10K Month', 'Reached €10,000 in monthly revenue.', 'trending-up', 'rare', '{"type":"revenue_threshold","cents":1000000}'),
  ('revenue-25k', '€25K Month', 'Reached €25,000 in monthly revenue.', 'trending-up', 'rare', '{"type":"revenue_threshold","cents":2500000}'),
  ('revenue-50k', '€50K Month', 'Reached €50,000 in monthly revenue.', 'trending-up', 'epic', '{"type":"revenue_threshold","cents":5000000}'),
  ('revenue-100k', '€100K Month', 'Reached €100,000 in monthly revenue.', 'trending-up', 'legendary', '{"type":"revenue_threshold","cents":10000000}'),
  ('top-100', 'Top 100', 'Ranked in the global top 100.', 'medal', 'rare', '{"type":"rank_threshold","rank":100}'),
  ('top-50', 'Top 50', 'Ranked in the global top 50.', 'medal', 'epic', '{"type":"rank_threshold","rank":50}'),
  ('top-10', 'Top 10', 'Ranked in the global top 10.', 'medal', 'legendary', '{"type":"rank_threshold","rank":10}'),
  ('founding-member', 'Founding Member', 'Joined ASCEND during the founding cohort.', 'gem', 'epic', '{"type":"founding_member"}');

insert into trophies (id, name, description, icon) values
  ('global-1', 'Global #1', 'Ranked #1 worldwide on ASCEND.', 'crown'),
  ('category-champion', 'Category Champion', 'Ranked #1 in your business category.', 'shield'),
  ('founder-of-the-month', 'Founder of the Month', 'Highest growth of the month.', 'star'),
  ('growth-champion', 'Growth Champion', 'Fastest-growing founder of the season.', 'flame'),
  ('revenue-100k-trophy', '€100K Month', 'Crossed €100,000 in monthly revenue.', 'trophy'),
  ('founding-member-trophy', 'Founding Member', 'One of ASCEND''s first 500 members.', 'gem');

insert into seasons (number, name, label, starts_at, ends_at, is_active) values
  (1, 'ASCEND SEASON 01', 'September 2026', '2026-09-01T00:00:00Z', '2026-11-30T23:59:59Z', true);

insert into challenges (season_id, slug, title, description, type, target, reward_achievement_id, starts_at, ends_at)
select
  s.id, v.slug, v.title, v.description, v.type, v.target, v.reward_achievement_id, s.starts_at, s.ends_at
from seasons s
cross join (values
  ('first-10k-month', 'First €10K Month', 'Reach €10,000 in monthly revenue for the first time.', 'revenue_threshold', 1000000, 'revenue-10k'),
  ('growth-30', '+30% Growth', 'Grow your monthly revenue by 30% or more.', 'growth_threshold', 30, null),
  ('consistency-30', '30-Day Consistency', 'Keep your revenue source connected and verified for 30 days straight.', 'consistency', 30, null),
  ('international-customer', 'First International Customer', 'Coming soon.', 'coming_soon', 1, null),
  ('launch-something-new', 'Launch Something New', 'Coming soon.', 'coming_soon', 1, null)
) as v(slug, title, description, type, target, reward_achievement_id)
where s.is_active = true;
