-- A sold listing is the record of the sale (price, commission, buyer). It
-- referenced the seller's copy with "on delete cascade", so it was deleted
-- the moment the title changed hands: the "Ventes récentes" ticker stayed
-- empty, the commission left no trace, and a webhook redelivered by Stripe
-- found no listing and refunded a completed sale. The listing now outlives
-- the copy; keeping sales also means a buyer must stay deletable.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'title_listings'::regclass
      and con.contype = 'f'
      and a.attname in ('user_title_id', 'buyer_id')
  loop
    execute format('alter table title_listings drop constraint %I', c.conname);
  end loop;
end $$;

alter table title_listings alter column user_title_id drop not null;

alter table title_listings add constraint title_listings_user_title_id_fkey
  foreign key (user_title_id) references user_titles (id) on delete set null;
alter table title_listings add constraint title_listings_buyer_id_fkey
  foreign key (buyer_id) references profiles (id) on delete set null;
