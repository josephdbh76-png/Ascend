-- Adds "The Fondator" to the title catalog — an exclusive, manually
-- granted title reserved for ASCEND's own creator. Not tied to an
-- automatic requirement (no computable "founded the platform" event),
-- so it is never auto-granted by title.service.ts; ownership is assigned
-- directly, once, to a specific account.

insert into titles (id, name, description, icon, rarity, type, requirement) values
  ('the-fondator', 'The Fondator', 'A construit ASCEND depuis le tout premier jour.', 'crown', 'exclusive', 'earned', '{"type":"manual"}');
