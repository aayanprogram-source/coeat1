-- Customer app reads: one story-card builder shared by the feed and the viewer, wallet, restaurant page, friends, polls, diary and stats.

create or replace function app.story_card(sid uuid, uid uuid) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object(
    'kind', 'story', 'id', s.id, 'created_at', s.created_at, 'caption', s.caption, 'photo_path', s.photo_path,
    'verified', s.verified, 'has_reward', s.has_reward,
    'author', jsonb_build_object('id', a.id, 'name', a.name, 'handle', a.handle, 'avatar_path', a.avatar_path),
    'restaurant', jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'logo_path', r.logo_path),
    'dishes', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'rating', d.rating) order by m.name)
      from story_dishes d join menu_items m on m.id = d.menu_item_id where d.story_id = s.id), '[]'::jsonb),
    'offer', case when o.id is not null and o.status = 'active' and o.ends_at > now() then app.offer_card(o) else null end,
    'my_code', (select jsonb_build_object('id', c.id, 'status', c.status, 'short_code', c.short_code, 'expires_at', c.expires_at)
      from codes c where c.holder_id = uid and c.restaurant_id = s.restaurant_id and c.status = 'issued' and c.expires_at > now() limit 1))
  from stories s
  join profiles a on a.id = s.author_id
  join restaurants r on r.id = s.restaurant_id
  left join offers o on o.id = s.offer_id
  where s.id = sid;
$$;
revoke all on function app.story_card(uuid, uuid) from public, anon, authenticated;

create or replace function get_feed(p_filter text default 'friends', p_cursor timestamptz default null,
  p_lat double precision default null, p_lng double precision default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  size integer := app.setting_int('feed_page_size')::int;
  radius integer := app.setting_int('nearby_radius_m')::int;
  ending integer := app.setting_int('ending_soon_threshold_hours')::int;
  interval_n integer := app.setting_int('sponsored_feed_interval')::int;
  max_sp integer := app.setting_int('sponsored_max_per_session')::int;
  city uuid;
  stories_json jsonb;
  last_ts timestamptz;
  organic_count integer;
  sponsored jsonb[] := '{}';
  result jsonb := '[]'::jsonb;
  item jsonb;
  i integer := 0;
  sp_used integer := 0;
  sp sponsored_placements;
  next_cursor timestamptz;
begin
  if uid is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  if p_filter not in ('friends', 'nearby', 'ending_soon') then perform app.fail('invalid_input'); end if;
  select city_id into city from profiles where id = uid;

  with page as (
    select s.id, s.created_at from stories s
    join restaurants r on r.id = s.restaurant_id and r.status = 'approved'
    left join offers o on o.id = s.offer_id
    where s.deleted_at is null and s.expires_at > now()
      and (s.author_id = uid or app.are_friends(uid, s.author_id))
      and (p_cursor is null or s.created_at < p_cursor)
      and (p_filter <> 'nearby' or (p_lat is not null and p_lng is not null and app.distance_m(p_lat, p_lng, r.lat, r.lng) <= radius))
      and (p_filter <> 'ending_soon' or (o.status = 'active' and o.ends_at between now() and now() + make_interval(hours => ending)))
    order by s.created_at desc limit size
  )
  select coalesce(jsonb_agg(app.story_card(id, uid) order by created_at desc), '[]'::jsonb), min(created_at), count(*)
    into stories_json, last_ts, organic_count from page;

  if organic_count >= size then next_cursor := last_ts; end if;

  if city is not null and p_filter = 'friends' then
    for sp in select * from app.eligible_placements(city, 'feed') order by random() limit max_sp loop
      sponsored := sponsored || app.sponsored_card(sp);
    end loop;
  end if;

  for item in select * from jsonb_array_elements(stories_json) loop
    result := result || item;
    i := i + 1;
    if i % interval_n = 0 and sp_used < coalesce(array_length(sponsored, 1), 0) and sp_used < max_sp then
      sp_used := sp_used + 1;
      result := result || sponsored[sp_used];
    end if;
  end loop;
  return jsonb_build_object('items', result, 'next_cursor', next_cursor);
end $$;

create or replace function get_story(p_story_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s stories%rowtype;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select * into s from stories where id = p_story_id and deleted_at is null and expires_at > now();
  if not found or not (s.author_id = auth.uid() or app.are_friends(auth.uid(), s.author_id)) then perform app.fail('story_not_found'); end if;
  return app.story_card(s.id, auth.uid());
end $$;

-- Expiry hides a story from friends through row level security; it must not erase the author's food diary.
create or replace function app.expire_items() returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update codes set status = 'expired' where status = 'issued' and expires_at <= now();
  update offers set status = 'ended' where status in ('active', 'paused') and ends_at <= now();
end $$;
revoke all on function app.expire_items() from public, anon, authenticated;

create or replace function my_wallet() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform app.fail('not_authenticated'); end if;
  return jsonb_build_object(
    'codes', coalesce((select jsonb_agg(row_to_json(t)) from (
      select c.id, c.short_code, c.status, c.expires_at, c.redeemed_at,
        jsonb_build_object('id', r.id, 'name', r.name, 'logo_path', r.logo_path) as restaurant,
        app.offer_card(o) as offer
      from codes c join offers o on o.id = c.offer_id join restaurants r on r.id = c.restaurant_id
      where c.holder_id = uid order by (c.status = 'issued') desc, c.issued_at desc limit 100) t), '[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(row_to_json(t)) from (
      select ur.id, ur.status, ur.claimed_at, l.label, l.type, l.value, jsonb_build_object('id', r.id, 'name', r.name) as restaurant
      from user_rewards ur join reward_levels l on l.id = ur.level_id join restaurants r on r.id = ur.restaurant_id
      where ur.user_id = uid order by (ur.status = 'available') desc, ur.created_at desc) t), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(row_to_json(t)) from (
      select r.id as restaurant_id, r.name,
        count(*) filter (where cr.status = 'released')::int as released,
        count(*) filter (where cr.status = 'held')::int as held,
        coalesce((select jsonb_agg(jsonb_build_object('friends_required', l.friends_required, 'label', l.label, 'type', l.type, 'value', l.value) order by l.friends_required)
          from reward_levels l where l.restaurant_id = r.id and l.is_active), '[]'::jsonb) as levels
      from referral_credits cr join restaurants r on r.id = cr.restaurant_id
      where cr.referrer_id = uid and cr.status in ('held', 'released') group by r.id, r.name) t), '[]'::jsonb));
end $$;

create or replace function restaurant_page(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare r restaurants%rowtype; o offers%rowtype;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  select * into r from restaurants where id = p_restaurant_id and status = 'approved';
  if not found then perform app.fail('restaurant_not_approved'); end if;
  select * into o from offers where restaurant_id = r.id and status = 'active' and now() between starts_at and ends_at
    and codes_issued < total_codes order by created_at desc limit 1;
  return jsonb_build_object(
    'restaurant', jsonb_build_object('id', r.id, 'name', r.name, 'address', r.address, 'lat', r.lat, 'lng', r.lng, 'phone', r.phone,
      'hours', r.hours, 'logo_path', r.logo_path, 'cover_path', r.cover_path, 'cuisine_ids', to_jsonb(r.cuisine_ids)),
    'rating', (select jsonb_build_object('avg', avg_rating, 'count', rating_count) from restaurant_ratings x where x.restaurant_id = r.id),
    'dishes', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price_paise', m.price_paise, 'is_veg', m.is_veg,
        'avg_rating', d.avg_rating, 'rating_count', d.rating_count) order by m.name)
      from menu_items m left join restaurant_dish_ratings d on d.menu_item_id = m.id where m.restaurant_id = r.id and m.is_available), '[]'::jsonb),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'avatar_path', p.avatar_path)) from profiles p
      where p.deleted_at is null and app.are_friends(auth.uid(), p.id)
        and (exists (select 1 from redemptions x where x.customer_id = p.id and x.restaurant_id = r.id and x.status = 'verified')
          or exists (select 1 from stories s where s.author_id = p.id and s.restaurant_id = r.id and s.deleted_at is null))), '[]'::jsonb),
    'offer', case when o.id is null then null else app.offer_card(o) end);
end $$;

create or replace function my_friends() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform app.fail('not_authenticated'); end if;
  return jsonb_build_object(
    'friends', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_path', p.avatar_path) order by p.name)
      from friendships f join profiles p on p.id = case when f.requester_id = uid then f.addressee_id else f.requester_id end
      where f.status = 'accepted' and (f.requester_id = uid or f.addressee_id = uid) and p.deleted_at is null), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('friendship_id', f.id, 'id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_path', p.avatar_path))
      from friendships f join profiles p on p.id = f.requester_id where f.addressee_id = uid and f.status = 'pending' and p.deleted_at is null), '[]'::jsonb));
end $$;

create or replace function recent_polls() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select p.id, p.question, p.closes_at, a.name as author
    from polls p join profiles a on a.id = p.author_id
    where (p.author_id = auth.uid() or app.are_friends(auth.uid(), p.author_id)) and p.closes_at > now() - interval '2 days'
    order by p.created_at desc limit 20) t), '[]'::jsonb);
end $$;

create or replace function my_open_visit() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  return (select jsonb_build_object('id', v.id, 'status', v.status, 'restaurant', r.name, 'table_label', v.table_label)
    from visits v join restaurants r on r.id = v.restaurant_id
    where v.status in ('open', 'billed') and app.is_visit_member(v.id) and v.created_at > now() - interval '1 day'
    order by v.created_at desc limit 1);
end $$;

create or replace function food_diary(p_limit integer default 20, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select s.id, s.photo_path, s.caption, s.created_at, s.verified, jsonb_build_object('id', r.id, 'name', r.name) as restaurant,
      coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'rating', d.rating)) from story_dishes d join menu_items m on m.id = d.menu_item_id where d.story_id = s.id), '[]'::jsonb) as dishes
    from stories s join restaurants r on r.id = s.restaurant_id
    where s.author_id = auth.uid() and s.deleted_at is null
    order by s.created_at desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 50)) t), '[]'::jsonb);
end $$;

create or replace function my_profile_stats() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform app.fail('not_authenticated'); end if;
  return jsonb_build_object(
    'stories', (select count(*) from stories where author_id = uid and deleted_at is null),
    'friends', (select count(*) from friendships where status = 'accepted' and (requester_id = uid or addressee_id = uid)),
    'friends_redeemed', (select count(*) from referral_credits where referrer_id = uid and status in ('held', 'released')),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'icon', b.icon, 'awarded_at', a.awarded_at) order by a.awarded_at desc)
      from badge_awards a join badge_definitions b on b.id = a.badge_id where a.user_id = uid), '[]'::jsonb));
end $$;

grant execute on function get_feed(text, timestamptz, double precision, double precision), get_story(uuid), my_wallet(),
  restaurant_page(uuid), my_friends(), recent_polls(), my_open_visit(), food_diary(integer, integer), my_profile_stats() to authenticated;
