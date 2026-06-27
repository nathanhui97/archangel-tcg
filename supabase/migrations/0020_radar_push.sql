-- Milestone 7 follow-up: the "radar" push.
--
-- When someone adds a card to a PUBLIC binder, notify nearby players who have
-- that card on their wantlist ("@owner near you listed CARD"). Reuses the same
-- earthdistance math as get_nearby_cards (migration 0007) and send_push (0018).

-- Recipient selection, factored out so it can be unit-tested: returns the ids of
-- users who want p_card_id and are within 25 km of the owner (or owner ships).
create or replace function public.radar_recipients(p_card_id text, p_owner_id uuid)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with o as (select lat, lng, willing_to_ship from public.profiles where id = p_owner_id)
  select wl.user_id
  from public.wantlist_items wl
  join public.profiles p on p.id = wl.user_id
  cross join o
  where wl.card_id = p_card_id
    and wl.user_id <> p_owner_id
    and (
      o.willing_to_ship
      or (
        o.lat is not null and o.lng is not null and p.lat is not null and p.lng is not null
        and earth_distance(
              ll_to_earth(o.lat::float8, o.lng::float8),
              ll_to_earth(p.lat::float8, p.lng::float8)
            ) / 1000 <= 25
      )
    );
$$;

revoke all on function public.radar_recipients(text, uuid) from public, anon, authenticated;
grant execute on function public.radar_recipients(text, uuid) to service_role;

create or replace function public.notify_nearby_wanters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  owner_handle text;
  card_name text;
  r record;
begin
  -- Only public binders count toward the radar.
  select bn.user_id into owner_id
  from public.binders bn where bn.id = new.binder_id and bn.is_public = true;
  if owner_id is null then return new; end if;

  select handle into owner_handle from public.profiles where id = owner_id;
  select name into card_name from public.cards where id = new.card_id;

  for r in select user_id from public.radar_recipients(new.card_id, owner_id) loop
    perform public.send_push(
      r.user_id,
      'On your radar',
      '@' || coalesce(owner_handle, 'someone') || ' near you listed ' || coalesce(card_name, new.card_id),
      jsonb_build_object('cardId', new.card_id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists binder_items_notify_wanters on public.binder_items;
create trigger binder_items_notify_wanters
  after insert on public.binder_items
  for each row execute function public.notify_nearby_wanters();
