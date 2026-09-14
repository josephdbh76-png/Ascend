-- Localizes the product catalog to French. Written as UPDATEs (not a
-- rewrite of 20260101000004_seed_catalog.sql) so this applies cleanly
-- whether or not that seed has already run against a given database.

update achievements set name = 'Premiers revenus vérifiés', description = 'Tu as connecté et vérifié ta première source de revenus.' where id = 'first-verified-revenue';
update achievements set name = '1K mensuels', description = 'Tu as atteint 1 000 € de revenus mensuels.' where id = 'revenue-1k';
update achievements set name = '5K mensuels', description = 'Tu as atteint 5 000 € de revenus mensuels.' where id = 'revenue-5k';
update achievements set name = '10K mensuels', description = 'Tu as atteint 10 000 € de revenus mensuels.' where id = 'revenue-10k';
update achievements set name = '25K mensuels', description = 'Tu as atteint 25 000 € de revenus mensuels.' where id = 'revenue-25k';
update achievements set name = '50K mensuels', description = 'Tu as atteint 50 000 € de revenus mensuels.' where id = 'revenue-50k';
update achievements set name = '100K mensuels', description = 'Tu as atteint 100 000 € de revenus mensuels.' where id = 'revenue-100k';
update achievements set name = 'Top 100', description = 'Tu es classé dans le top 100 mondial.' where id = 'top-100';
update achievements set name = 'Top 50', description = 'Tu es classé dans le top 50 mondial.' where id = 'top-50';
update achievements set name = 'Top 10', description = 'Tu es classé dans le top 10 mondial.' where id = 'top-10';
update achievements set name = 'Membre fondateur', description = 'Tu as rejoint ASCEND parmi la cohorte fondatrice.' where id = 'founding-member';

update trophies set name = '#1 mondial', description = 'Classé #1 mondial sur ASCEND.' where id = 'global-1';
update trophies set name = 'Champion de catégorie', description = 'Classé #1 dans ta catégorie d''activité.' where id = 'category-champion';
update trophies set name = 'Fondateur du mois', description = 'Plus forte croissance du mois.' where id = 'founder-of-the-month';
update trophies set name = 'Growth Champion', description = 'Croissance la plus rapide de la saison.' where id = 'growth-champion';
update trophies set name = '100K mensuels', description = 'Tu as franchi 100 000 € de revenus mensuels.' where id = 'revenue-100k-trophy';
update trophies set name = 'Membre fondateur', description = 'Un des 500 premiers membres d''ASCEND.' where id = 'founding-member-trophy';

update seasons set name = 'ASCEND SAISON 01', label = 'Septembre 2026' where number = 1;

update challenges set title = 'Premier 10K', description = 'Atteins 10 000 € de revenus mensuels pour la première fois.' where slug = 'first-10k-month';
update challenges set title = '+30 % de croissance', description = 'Fais croître tes revenus mensuels d''au moins 30 %.' where slug = 'growth-30';
update challenges set title = '30 jours de régularité', description = 'Garde ta source de revenus connectée et vérifiée pendant 30 jours d''affilée.' where slug = 'consistency-30';
update challenges set title = 'Premier client international', description = 'Bientôt disponible — suis ton premier client hors de ton pays.' where slug = 'international-customer';
update challenges set title = 'Nouveau lancement', description = 'Bientôt disponible — enregistre le lancement d''un nouveau produit ou d''une fonctionnalité.' where slug = 'launch-something-new';
