-- Two purchasable titles below "The Business Man" (1 of 1, 500€) in both
-- price and rarity, so there's an accessible tier between free/earned
-- titles and the flagship exclusive one. No real payment is wired up yet
-- (see purchase_exclusive_title), so these stay "Bientôt disponible" in
-- the UI until Stripe Checkout exists for one-off purchases.

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-insider', 'The Insider', 'Un cercle restreint de fondateurs ASCEND.', 'gem', 'epic', 'purchasable', 5000, 50, 50, '{}'),
  ('the-ambitious', 'The Ambitious', 'Affiche ton ambition sur ton profil ASCEND.', 'medal', 'rare', 'purchasable', 1500, 200, 200, '{}');
