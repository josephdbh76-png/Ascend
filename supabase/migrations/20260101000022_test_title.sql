-- A cheap (1€), unlimited-supply purchasable title — lets a real end-to-end
-- purchase be tested (checkout → webhook → grant_purchased_title) for
-- one euro instead of risking a real purchase on one of the higher-priced,
-- limited-supply titles.

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-spark', 'The Spark', 'Le premier pas sur ASCEND.', 'flame', 'common', 'purchasable', 100, null, null, '{}');
