-- Every existing challenge assumed real revenue was already flowing
-- (first 10K€, +30% growth...) — nothing recognized an entrepreneur who
-- hasn't sold anything yet. Adds a beginner ladder: first sale, then
-- 100€/500€/1000€, for every currently active season.

insert into challenges (season_id, slug, title, description, type, target, reward_achievement_id, starts_at, ends_at)
select
  s.id, v.slug, v.title, v.description, v.type, v.target, v.reward_achievement_id, s.starts_at, s.ends_at
from seasons s
cross join (values
  ('first-sale', 'Première vente', 'Réalise ta toute première vente vérifiée sur ASCEND.', 'revenue_threshold', 1, null),
  ('first-100', 'Premiers 100 €', 'Atteins 100 € de revenus mensuels vérifiés.', 'revenue_threshold', 10000, null),
  ('first-500', 'Premiers 500 €', 'Atteins 500 € de revenus mensuels vérifiés.', 'revenue_threshold', 50000, null),
  ('first-1000', 'Premiers 1 000 €', 'Atteins 1 000 € de revenus mensuels vérifiés.', 'revenue_threshold', 100000, null)
) as v(slug, title, description, type, target, reward_achievement_id)
where s.is_active = true;
