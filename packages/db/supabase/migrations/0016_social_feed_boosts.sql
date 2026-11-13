-- Group visits, feed, explore, polls, reports, analytics views and boosts.

-- Group visits.
create or replace function start_group_visit(p_restaurant_id uuid, p_table_label text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare vid uuid; tok text;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  if not exists (select 1 from restaurants where id = p_restaurant_id and status = 'approved') then perform app.fail('restaurant_not_approved'); end if;
  if not exists (select 1 from checkins where user_id = auth.uid() and restaurant_id = p_restaurant_id and expires_at > now()) then perform app.fail('checkin_required'); end if;
  insert into visits (restaurant_id, host_id, table_label) values (p_restaurant_id, auth.uid(), left(btrim(coalesce(p_table_label, '')), 30))
    returning id, join_token into vid, tok;
  insert into visit_members (visit_id, user_id, joined_via) values (vid, auth.uid(), 'host');
  return jsonb_build_object('id', vid, 'join_token', tok);
end $$;

create or replace function join_group_visit(p_join_token text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v visits%rowtype;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select * into v from visits where join_token = p_join_token;
  if not found or v.status <> 'open' then perform app.fail('visit_not_open'); end if;
  if exists (select 1 from visit_members where visit_id = v.id and user_id = auth.uid()) then perform app.fail('visit_member_exists'); end if;
  insert into visit_members (visit_id, user_id, joined_via) values (v.id, auth.uid(), 'qr');
  return v.id;
end $$;

create or replace function add_visit_member_by_phone(p_visit_id uuid, p_phone text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  if not exists (select 1 from visits where id = p_visit_id and host_id = auth.uid() and status = 'open') then perform app.fail('visit_not_open'); end if;
  select id into uid from profiles where phone = p_phone and deleted_at is null;
  if uid is null then perform app.fail('invalid_input'); end if;
  insert into visit_members (visit_id, user_id, joined_via) values (p_visit_id, uid, 'phone') on conflict do nothing;
end $$;

create or replace function get_visit(p_visit_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare v visits%rowtype;
begin
  select * into v from visits where id = p_visit_id;
  if not found or not app.is_visit_member(v.id) then perform app.fail('visit_not_member'); end if;
  return jsonb_build_object('id', v.id, 'status', v.status, 'table_label', v.table_label, 'restaurant_id', v.restaurant_id,
    'join_token', case when v.host_id = auth.uid() then v.join_token else null end,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_path', p.avatar_path))
      from visit_members m join profiles p on p.id = m.user_id where m.visit_id = v.id), '[]'::jsonb));
end $$;

-- Aggregate views. They run as the owner, so each filters by who is asking.
create view restaurant_dish_ratings as
select m.id as menu_item_id, m.restaurant_id, m.name, count(d.id)::int as rating_count,
       round(avg(d.rating)::numeric, 2) as avg_rating,
       count(d.id) filter (where s.verified)::int as verified_count
from menu_items m
left join story_dishes d on d.menu_item_id = m.id
left join stories s on s.id = d.story_id and s.deleted_at is null
where exists (select 1 from restaurants r where r.id = m.restaurant_id and r.status = 'approved')
   or app.is_restaurant_member(m.restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view')
group by m.id;

create view restaurant_ratings as
select s.restaurant_id, count(d.id)::int as rating_count, round(avg(d.rating)::numeric, 2) as avg_rating
from stories s join story_dishes d on d.story_id = s.id
where s.deleted_at is null
  and (exists (select 1 from restaurants r where r.id = s.restaurant_id and r.status = 'approved')
       or app.is_restaurant_member(s.restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'))
group by s.restaurant_id;

create view promoter_leaderboard as
select c.restaurant_id, c.referrer_id, p.name, p.handle,
       count(*) filter (where c.status in ('held', 'released'))::int as friends_redeemed,
       count(*) filter (where c.status = 'released')::int as friends_released
from referral_credits c join profiles p on p.id = c.referrer_id
where app.is_restaurant_member(c.restaurant_id, array['owner', 'manager']) or app.has_permission('redemptions.view')
group by c.restaurant_id, c.referrer_id, p.name, p.handle;

create view restaurant_daily_stats as
select r.restaurant_id, (r.verified_at at time zone 'Asia/Kolkata')::date as day,
       count(*)::int as redemptions,
       count(distinct r.customer_id)::int as new_customers,
       coalesce(round(avg(r.bill_paise)), 0)::bigint as avg_bill_paise,
       coalesce(sum(r.fee_paise), 0)::bigint as fee_paise
from redemptions r
where r.status = 'verified'
  and (app.is_restaurant_member(r.restaurant_id, array['owner', 'manager']) or app.has_permission('redemptions.view'))
group by r.restaurant_id, (r.verified_at at time zone 'Asia/Kolkata')::date;

create view platform_analytics as
select
  (select count(*) from stories where deleted_at is null)::int as stories_posted,
  (select count(*) from codes)::int as codes_issued,
  (select count(*) from redemptions where status = 'verified')::int as redemptions_verified,
  coalesce((select round(avg(extract(epoch from (c.redeemed_at - c.issued_at)) / 3600)::numeric, 1) from codes c where c.redeemed_at is not null), 0) as avg_hours_to_redeem,
  (select count(*) from (select customer_id, restaurant_id from redemptions where status = 'verified' group by 1, 2 having count(*) > 1) x)::int as repeat_visits,
  (select count(*) from restaurants where status = 'approved')::int as active_restaurants,
  coalesce((select sum(fee_paise + gst_paise) from fee_ledger where status in ('accrued', 'invoiced')), 0)::bigint as fees_accrued_paise,
  coalesce((select sum(l.fee_paise + l.gst_paise) from fee_ledger l join invoices i on i.id = l.invoice_id where i.status = 'paid'), 0)::bigint as fees_collected_paise,
  (select count(*) from fraud_flags where status = 'open')::int as open_fraud_flags,
  (select count(*) from data_requests where status = 'open')::int as open_data_requests
where app.has_permission('overview.view');

grant select on restaurant_dish_ratings, restaurant_ratings, promoter_leaderboard, restaurant_daily_stats, platform_analytics to authenticated;

create or replace function get_leaderboard(p_restaurant_id uuid, p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not (app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) or app.has_permission('redemptions.view')) then perform app.fail('not_permitted'); end if;
  return coalesce((select jsonb_agg(to_jsonb(t)) from (
    select referrer_id, name, handle, friends_redeemed, friends_released from promoter_leaderboard
    where restaurant_id = p_restaurant_id order by friends_redeemed desc, name limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

-- Sponsored placements eligible to be served right now in a city.
create or replace function app.eligible_placements(p_city uuid, p_placement text) returns setof sponsored_placements
language sql stable security definer set search_path = public, extensions as $$
  select sp.* from sponsored_placements sp
  join offers o on o.id = sp.offer_id
  join restaurants r on r.id = sp.restaurant_id
  join cities c on c.id = sp.city_id
  where app.setting_bool('sponsored_enabled') and c.sponsored_enabled
    and sp.placement = p_placement and sp.city_id = p_city and sp.status = 'active'
    and now() between sp.starts_at and sp.ends_at
    and o.status = 'active' and now() between o.starts_at and o.ends_at and o.codes_issued < o.total_codes
    and r.status = 'approved';
$$;
revoke all on function app.eligible_placements(uuid, text) from public, anon, authenticated;

create or replace function app.offer_card(o offers) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('id', o.id, 'title', o.title, 'discount_percent', o.discount_percent,
    'discount_cap_paise', o.discount_cap_paise, 'min_bill_paise', o.min_bill_paise, 'ends_at', o.ends_at,
    'drop_at', o.drop_at, 'total_codes', o.total_codes,
    'remaining', case when app.setting_bool('show_live_counters') then o.total_codes - o.codes_issued else null end,
    'low_stock', (o.total_codes - o.codes_issued) <= app.setting_int('low_stock_threshold'));
$$;
revoke all on function app.offer_card(offers) from public, anon, authenticated;

create or replace function app.sponsored_card(sp sponsored_placements) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('kind', 'sponsored', 'placement_id', sp.id, 'label', app.setting_text('sponsored_label'),
    'restaurant', jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'logo_path', r.logo_path, 'cover_path', r.cover_path),
    'offer', app.offer_card(o))
  from restaurants r, offers o where r.id = sp.restaurant_id and o.id = sp.offer_id;
$$;
revoke all on function app.sponsored_card(sponsored_placements) from public, anon, authenticated;

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
  organic jsonb[] := '{}';
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

  select coalesce(jsonb_agg(row_json order by created_at desc), '[]'::jsonb) into stories_json from (
    select s.created_at, jsonb_build_object(
      'kind', 'story', 'id', s.id, 'created_at', s.created_at, 'caption', s.caption, 'photo_path', s.photo_path,
      'verified', s.verified, 'has_reward', s.has_reward,
      'author', jsonb_build_object('id', a.id, 'name', a.name, 'handle', a.handle, 'avatar_path', a.avatar_path),
      'restaurant', jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'logo_path', r.logo_path),
      'dishes', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'rating', d.rating) order by m.name)
        from story_dishes d join menu_items m on m.id = d.menu_item_id where d.story_id = s.id), '[]'::jsonb),
      'offer', case when o.id is not null and o.status = 'active' and o.ends_at > now() then app.offer_card(o) else null end,
      'my_code', (select jsonb_build_object('id', c.id, 'status', c.status, 'short_code', c.short_code, 'expires_at', c.expires_at)
        from codes c where c.holder_id = uid and c.restaurant_id = s.restaurant_id and c.status = 'issued' and c.expires_at > now() limit 1)
    ) as row_json
    from stories s
    join profiles a on a.id = s.author_id
    join restaurants r on r.id = s.restaurant_id and r.status = 'approved'
    left join offers o on o.id = s.offer_id
    where s.deleted_at is null and s.expires_at > now()
      and (s.author_id = uid or app.are_friends(uid, s.author_id))
      and (p_cursor is null or s.created_at < p_cursor)
      and (p_filter <> 'nearby' or (p_lat is not null and p_lng is not null and app.distance_m(p_lat, p_lng, r.lat, r.lng) <= radius))
      and (p_filter <> 'ending_soon' or (o.status = 'active' and o.ends_at between now() and now() + make_interval(hours => ending)))
    order by s.created_at desc limit size
  ) t;

  if jsonb_array_length(stories_json) > 0 then
    next_cursor := ((stories_json -> (jsonb_array_length(stories_json) - 1)) ->> 'created_at')::timestamptz;
  end if;
  if jsonb_array_length(stories_json) < size then next_cursor := null; end if;

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

create or replace function explore_restaurants(p_query text default null, p_cuisine uuid default null,
  p_lat double precision default null, p_lng double precision default null, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  size integer := app.setting_int('feed_page_size')::int;
  radius integer := app.setting_int('nearby_radius_m')::int;
  city uuid;
  sp sponsored_placements;
  sponsored jsonb[] := '{}';
  items jsonb;
begin
  if uid is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select city_id into city from profiles where id = uid;
  items := coalesce((select jsonb_agg(row_json order by dist nulls last, name) from (
    select r.name, case when p_lat is null or p_lng is null then null else app.distance_m(p_lat, p_lng, r.lat, r.lng) end as dist,
      jsonb_build_object('kind', 'restaurant', 'id', r.id, 'name', r.name, 'slug', r.slug, 'logo_path', r.logo_path,
        'cover_path', r.cover_path, 'address', r.address, 'lat', r.lat, 'lng', r.lng, 'cuisine_ids', to_jsonb(r.cuisine_ids),
        'avg_rating', (select avg_rating from restaurant_ratings x where x.restaurant_id = r.id),
        'distance_m', case when p_lat is null or p_lng is null then null else round(app.distance_m(p_lat, p_lng, r.lat, r.lng)) end,
        'offer', (select app.offer_card(o) from offers o where o.restaurant_id = r.id and o.status = 'active'
          and now() between o.starts_at and o.ends_at and o.codes_issued < o.total_codes order by o.created_at desc limit 1)) as row_json
    from restaurants r
    where r.status = 'approved'
      and (p_query is null or btrim(p_query) = '' or r.name ilike '%' || btrim(p_query) || '%'
           or exists (select 1 from menu_items m where m.restaurant_id = r.id and m.name ilike '%' || btrim(p_query) || '%'))
      and (p_cuisine is null or p_cuisine = any (r.cuisine_ids))
      and (p_lat is null or p_lng is null or app.distance_m(p_lat, p_lng, r.lat, r.lng) <= radius)
    order by dist nulls last, r.name offset greatest(p_offset, 0) limit size
  ) t), '[]'::jsonb);
  if city is not null and p_offset = 0 and (p_query is null or btrim(p_query) = '') then
    for sp in select * from app.eligible_placements(city, 'explore') order by random() limit app.setting_int('sponsored_max_per_session')::int loop
      sponsored := sponsored || app.sponsored_card(sp);
    end loop;
  end if;
  return jsonb_build_object('items', items, 'sponsored', to_jsonb(sponsored));
end $$;

create or replace function record_placement_event(p_placement_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  if p_kind not in ('impression', 'tap') then perform app.fail('invalid_input'); end if;
  if not exists (select 1 from sponsored_placements where id = p_placement_id and status = 'active' and now() between starts_at and ends_at) then return; end if;
  insert into placement_events (placement_id, user_id, kind) values (p_placement_id, auth.uid(), p_kind) on conflict do nothing;
end $$;

-- Polls.
create or replace function create_poll(p_question text, p_restaurant_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid; rid uuid; i integer := 0;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  if length(btrim(p_question)) < 3 or array_length(p_restaurant_ids, 1) not between 2 and 4 then perform app.fail('invalid_input'); end if;
  if (select count(*) from restaurants where id = any (p_restaurant_ids) and status = 'approved') <> array_length(p_restaurant_ids, 1) then perform app.fail('invalid_input'); end if;
  insert into polls (author_id, question, closes_at) values (auth.uid(), btrim(p_question), now() + make_interval(hours => app.setting_int('story_lifetime_hours')::int)) returning id into pid;
  foreach rid in array p_restaurant_ids loop
    insert into poll_options (poll_id, restaurant_id, sort_order) values (pid, rid, i);
    i := i + 1;
  end loop;
  return pid;
end $$;

create or replace function vote_poll(p_poll_id uuid, p_option_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p polls%rowtype;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select * into p from polls where id = p_poll_id;
  if not found or not (p.author_id = auth.uid() or app.are_friends(auth.uid(), p.author_id)) then perform app.fail('not_permitted'); end if;
  if p.closes_at <= now() then perform app.fail('poll_closed'); end if;
  if not exists (select 1 from poll_options where id = p_option_id and poll_id = p_poll_id) then perform app.fail('invalid_input'); end if;
  if exists (select 1 from poll_votes where poll_id = p_poll_id and user_id = auth.uid()) then perform app.fail('poll_already_voted'); end if;
  insert into poll_votes (poll_id, option_id, user_id) values (p_poll_id, p_option_id, auth.uid());
end $$;

create or replace function poll_results(p_poll_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare p polls%rowtype;
begin
  select * into p from polls where id = p_poll_id;
  if not found or not (p.author_id = auth.uid() or app.are_friends(auth.uid(), p.author_id)) then perform app.fail('not_permitted'); end if;
  return jsonb_build_object('id', p.id, 'question', p.question, 'closes_at', p.closes_at,
    'my_vote', (select option_id from poll_votes where poll_id = p.id and user_id = auth.uid()),
    'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'restaurant_id', r.id, 'name', r.name, 'votes',
      (select count(*) from poll_votes v where v.option_id = o.id)) order by o.sort_order)
      from poll_options o join restaurants r on r.id = o.restaurant_id where o.poll_id = p.id));
end $$;

-- Reports and moderation.
create or replace function report_story(p_story_id uuid, p_reason_id uuid, p_note text default '') returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if not exists (select 1 from stories s where s.id = p_story_id and s.author_id <> auth.uid()) then perform app.fail('story_not_found'); end if;
  if not exists (select 1 from report_reasons where id = p_reason_id and is_active) then perform app.fail('invalid_input'); end if;
  if exists (select 1 from reports where reporter_id = auth.uid() and story_id = p_story_id and status = 'open') then return; end if;
  insert into reports (reporter_id, story_id, reason_id, note) values (auth.uid(), p_story_id, p_reason_id, left(coalesce(p_note, ''), 300));
end $$;

create or replace function resolve_report(p_report_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r reports%rowtype;
begin
  perform app.require_permission('moderation.manage');
  select * into r from reports where id = p_report_id for update;
  if not found or r.status <> 'open' or p_action not in ('remove', 'dismiss') then perform app.fail('invalid_input'); end if;
  if p_action = 'remove' then
    update stories set deleted_at = now(), removed_by = auth.uid() where id = r.story_id;
    update reports set status = 'actioned', resolved_by = auth.uid(), resolved_at = now() where story_id = r.story_id and status = 'open';
  else
    update reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now() where id = r.id;
  end if;
  perform app.audit('report', r.id::text, p_action, null, jsonb_build_object('story_id', r.story_id));
end $$;

create or replace function set_user_suspended(p_user_id uuid, p_suspended boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('users.manage');
  update profiles set suspended_at = case when p_suspended then now() else null end where id = p_user_id;
  if not found then perform app.fail('invalid_input'); end if;
  if p_suspended then update codes set status = 'void' where holder_id = p_user_id and status = 'issued'; end if;
  perform app.audit('user', p_user_id::text, case when p_suspended then 'suspend' else 'reinstate' end, null, null);
end $$;

create or replace function remove_story(p_story_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('moderation.manage');
  update stories set deleted_at = now(), removed_by = auth.uid() where id = p_story_id and deleted_at is null;
  perform app.audit('story', p_story_id::text, 'remove', null, null);
end $$;

create or replace function resolve_fraud_flag(p_flag_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare f fraud_flags%rowtype;
begin
  perform app.require_permission('fraud.manage');
  select * into f from fraud_flags where id = p_flag_id for update;
  if not found or f.status <> 'open' or p_action not in ('confirm', 'dismiss', 'suspend_user', 'suspend_restaurant') then perform app.fail('invalid_input'); end if;
  if p_action = 'suspend_user' and f.user_id is not null then
    update profiles set suspended_at = now() where id = f.user_id;
    update codes set status = 'void' where holder_id = f.user_id and status = 'issued';
  elsif p_action = 'suspend_restaurant' and f.restaurant_id is not null then
    update restaurants set status = 'suspended' where id = f.restaurant_id and status = 'approved';
    update offers set status = 'paused' where restaurant_id = f.restaurant_id and status = 'active';
  elsif p_action in ('suspend_user', 'suspend_restaurant') then
    perform app.fail('invalid_input');
  end if;
  update fraud_flags set status = case when p_action = 'dismiss' then 'dismissed' else 'confirmed' end, resolved_by = auth.uid(), resolved_at = now() where id = f.id;
  perform app.audit('fraud_flag', f.id::text, p_action, null, null);
end $$;

-- Boosts.
create or replace function app.boost_price(p_city uuid, p_starts timestamptz, p_ends timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare per_day bigint; days integer;
begin
  select coalesce(sponsored_price_per_day_paise, app.setting_int('sponsored_price_per_day_paise')) into per_day from cities where id = p_city;
  if per_day is null then perform app.fail('invalid_input'); end if;
  days := greatest(1, ceil(extract(epoch from (p_ends - p_starts)) / 86400.0)::int);
  return jsonb_build_object('days', days, 'per_day_paise', per_day, 'price_paise', per_day * days);
end $$;
revoke all on function app.boost_price(uuid, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function quote_boost(p_restaurant_id uuid, p_city uuid, p_starts timestamptz, p_ends timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if not app.setting_bool('sponsored_enabled') then perform app.fail('sponsored_disabled'); end if;
  if p_ends <= p_starts then perform app.fail('invalid_input'); end if;
  return app.boost_price(p_city, p_starts, p_ends);
end $$;

create or replace function create_boost(p_offer_id uuid, p_placement text, p_city uuid, p_starts timestamptz, p_ends timestamptz) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype; price jsonb; bid uuid; st text;
begin
  select * into o from offers where id = p_offer_id;
  if not found then perform app.fail('invalid_input'); end if;
  perform app.require_restaurant_role(o.restaurant_id, array['owner', 'manager']);
  if not app.setting_bool('sponsored_enabled') then perform app.fail('sponsored_disabled'); end if;
  if p_placement not in ('feed', 'explore') or p_ends <= p_starts or p_ends <= now() then perform app.fail('invalid_input'); end if;
  if not exists (select 1 from cities where id = p_city and is_active and sponsored_enabled) then perform app.fail('boost_not_allowed'); end if;
  if o.status <> 'active' or o.codes_issued >= o.total_codes or o.ends_at <= now()
     or not exists (select 1 from restaurants where id = o.restaurant_id and status = 'approved') then perform app.fail('boost_not_allowed'); end if;
  price := app.boost_price(p_city, p_starts, p_ends);
  st := case when app.setting_bool('boosts_need_approval') then 'pending_approval' else 'active' end;
  insert into sponsored_placements (restaurant_id, offer_id, placement, city_id, starts_at, ends_at, price_paise, price_per_day_paise, status, created_by)
  values (o.restaurant_id, o.id, p_placement, p_city, p_starts, p_ends, (price ->> 'price_paise')::bigint, (price ->> 'per_day_paise')::bigint, st, auth.uid())
  returning id into bid;
  perform app.audit('boost', bid::text, 'create', null, price);
  return bid;
end $$;

create or replace function approve_boost(p_boost_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare b sponsored_placements%rowtype;
begin
  perform app.require_permission('boosts.manage');
  select * into b from sponsored_placements where id = p_boost_id for update;
  if not found or b.status <> 'pending_approval' or p_decision not in ('approve', 'reject') then perform app.fail('invalid_input'); end if;
  update sponsored_placements set status = case p_decision when 'approve' then 'active' else 'rejected' end, review_note = p_note where id = b.id;
  perform app.audit('boost', b.id::text, p_decision, null, jsonb_build_object('note', p_note));
end $$;

create or replace function set_boost_state(p_boost_id uuid, p_state text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare b sponsored_placements%rowtype;
begin
  select * into b from sponsored_placements where id = p_boost_id for update;
  if not found or p_state not in ('paused', 'active', 'ended') then perform app.fail('invalid_input'); end if;
  if not (app.is_restaurant_member(b.restaurant_id, array['owner', 'manager']) or app.has_permission('boosts.manage')) then perform app.fail('not_permitted'); end if;
  if b.status in ('ended', 'rejected', 'pending_approval') then perform app.fail('invalid_input'); end if;
  if p_state = 'active' and b.status <> 'paused' then perform app.fail('invalid_input'); end if;
  update sponsored_placements set status = p_state, paused_at = case when p_state = 'paused' then now() else null end where id = b.id;
  perform app.audit('boost', b.id::text, p_state, jsonb_build_object('status', b.status), jsonb_build_object('status', p_state));
end $$;

create view boost_report as
select sp.id, sp.restaurant_id, sp.offer_id, sp.placement, sp.city_id, sp.starts_at, sp.ends_at, sp.status, sp.price_paise,
  (select count(*) from placement_events e where e.placement_id = sp.id and e.kind = 'impression')::int as impressions,
  (select count(*) from placement_events e where e.placement_id = sp.id and e.kind = 'tap')::int as taps,
  (select count(*) from codes c where c.offer_id = sp.offer_id and c.issued_at between sp.starts_at and sp.ends_at)::int as codes_issued,
  (select count(*) from redemptions x where x.offer_id = sp.offer_id and x.status = 'verified' and x.created_at between sp.starts_at and sp.ends_at)::int as redemptions,
  coalesce((select sum(l.fee_paise) from fee_ledger l where l.boost_id = sp.id and l.status <> 'void'), 0)::bigint as charged_paise
from sponsored_placements sp
where app.is_restaurant_member(sp.restaurant_id, array['owner', 'manager']) or app.has_permission('boosts.view');
grant select on boost_report to authenticated;

grant execute on function start_group_visit(uuid, text), join_group_visit(text), add_visit_member_by_phone(uuid, text), get_visit(uuid),
  get_leaderboard(uuid, integer), get_feed(text, timestamptz, double precision, double precision),
  explore_restaurants(text, uuid, double precision, double precision, integer), record_placement_event(uuid, text),
  create_poll(text, uuid[]), vote_poll(uuid, uuid), poll_results(uuid), report_story(uuid, uuid, text), resolve_report(uuid, text),
  set_user_suspended(uuid, boolean), remove_story(uuid), resolve_fraud_flag(uuid, text), quote_boost(uuid, uuid, timestamptz, timestamptz),
  create_boost(uuid, text, uuid, timestamptz, timestamptz), approve_boost(uuid, text, text), set_boost_state(uuid, text) to authenticated;
