-- Notifications, check-ins, stories, personal codes, redemptions, credits and rewards.

create or replace function app.in_active_hours(hours jsonb, at_time timestamptz) returns boolean
language plpgsql immutable as $$
declare local_ts timestamp := at_time at time zone 'Asia/Kolkata'; w jsonb;
begin
  if hours is null or jsonb_array_length(hours) = 0 then return true; end if;
  for w in select * from jsonb_array_elements(hours) loop
    if (w ->> 'day')::int = extract(dow from local_ts)::int
       and local_ts::time >= (w ->> 'from')::time and local_ts::time < (w ->> 'to')::time then
      return true;
    end if;
  end loop;
  return false;
end $$;

-- Delivers one message: inbox row, then a queued push if consent and the weekly alert limit allow.
create or replace function app.deliver(uid uuid, evt text, title text, body text, params jsonb, campaign uuid default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare p profiles%rowtype; sent integer;
begin
  select * into p from profiles where id = uid;
  insert into notifications (user_id, event, title, body, data) values (uid, evt, title, body, params);
  insert into notification_log (user_id, campaign_id, event, channel, status) values (uid, campaign, evt, 'inbox', 'sent');
  if p.id is not null and not p.notifications_enabled then
    insert into notification_log (user_id, campaign_id, event, channel, status) values (uid, campaign, evt, 'push', 'skipped_consent');
    return;
  end if;
  select count(*) into sent from notification_log
    where user_id = uid and channel = 'push' and status in ('queued', 'sent') and created_at > now() - interval '7 days';
  if sent >= app.setting_int('alert_limit_per_week') then
    insert into notification_log (user_id, campaign_id, event, channel, status) values (uid, campaign, evt, 'push', 'skipped_limit');
  else
    insert into notification_log (user_id, campaign_id, event, channel, status, detail) values (uid, campaign, evt, 'push', 'queued', title || E'
' || body);
  end if;
end $$;
revoke all on function app.deliver(uuid, text, text, text, jsonb, uuid) from public, anon, authenticated;

-- Renders the editable template for the user's locale and delivers it.
create or replace function app.notify(uid uuid, evt text, params jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare t notification_templates%rowtype; title text; body text; k text; v text;
begin
  select * into t from notification_templates where event = evt and is_enabled
    and locale in (coalesce((select locale from profiles where id = uid), 'en'), 'en')
    order by (locale = 'en') limit 1;
  if not found then
    insert into notification_log (user_id, event, channel, status) values (uid, evt, 'inbox', 'skipped_no_template');
    return;
  end if;
  title := t.title;
  body := t.body;
  for k, v in select * from jsonb_each_text(params) loop
    title := replace(title, '{' || k || '}', v);
    body := replace(body, '{' || k || '}', v);
  end loop;
  perform app.deliver(uid, evt, title, body, params);
end $$;
revoke all on function app.notify(uuid, text, jsonb) from public, anon, authenticated;

-- Check-ins and stories.
create or replace function check_in(p_restaurant_id uuid, p_lat double precision, p_lng double precision) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r restaurants%rowtype; dist double precision; cid uuid; exp timestamptz;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select * into r from restaurants where id = p_restaurant_id;
  if not found or r.status <> 'approved' then perform app.fail('restaurant_not_approved'); end if;
  dist := app.distance_m(p_lat, p_lng, r.lat, r.lng);
  if dist > app.setting_int('checkin_radius_m') then perform app.fail('checkin_too_far'); end if;
  exp := now() + make_interval(mins => app.setting_int('checkin_window_minutes')::int);
  insert into checkins (user_id, restaurant_id, lat, lng, distance_m, expires_at) values (auth.uid(), r.id, p_lat, p_lng, dist, exp) returning id into cid;
  return jsonb_build_object('id', cid, 'restaurant_id', r.id, 'distance_m', round(dist), 'expires_at', exp);
end $$;

create or replace function post_story(p_checkin_id uuid, p_photo_path text, p_caption text, p_dishes jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  c checkins%rowtype;
  sid uuid;
  oid uuid;
  vid uuid;
  d jsonb;
  is_verified boolean;
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  select * into c from checkins where id = p_checkin_id and user_id = auth.uid();
  if not found then perform app.fail('checkin_required'); end if;
  if c.expires_at <= now() then perform app.fail('checkin_expired'); end if;
  if length(coalesce(p_photo_path, '')) < 1 or length(coalesce(p_caption, '')) > 280 then perform app.fail('invalid_input'); end if;
  if jsonb_typeof(p_dishes) <> 'array' or jsonb_array_length(p_dishes) < 1 or jsonb_array_length(p_dishes) > 10 then perform app.fail('invalid_input'); end if;

  for d in select * from jsonb_array_elements(p_dishes) loop
    if (d ->> 'rating')::int not between 1 and 5 then perform app.fail('invalid_input'); end if;
    if not exists (select 1 from menu_items m where m.id = (d ->> 'menu_item_id')::uuid and m.restaurant_id = c.restaurant_id and m.is_available) then
      perform app.fail('menu_item_unavailable');
    end if;
  end loop;

  select id into oid from offers where restaurant_id = c.restaurant_id and status = 'active' and now() between starts_at and ends_at
    and codes_issued < total_codes order by created_at desc limit 1;
  select v.id into vid from visits v where v.restaurant_id = c.restaurant_id and v.status in ('open', 'billed', 'verified')
    and v.created_at > now() - interval '1 day' and app.is_visit_member(v.id) order by v.created_at desc limit 1;
  is_verified := exists (select 1 from redemptions r where r.customer_id = auth.uid() and r.restaurant_id = c.restaurant_id
    and r.status = 'verified' and r.verified_at > now() - make_interval(mins => app.setting_int('checkin_window_minutes')::int));

  insert into stories (author_id, restaurant_id, offer_id, visit_id, checkin_id, photo_path, caption, has_reward, verified, expires_at)
  values (auth.uid(), c.restaurant_id, oid, vid, c.id, p_photo_path, btrim(p_caption), oid is not null, is_verified,
    now() + make_interval(hours => app.setting_int('story_lifetime_hours')::int))
  returning id into sid;
  for d in select * from jsonb_array_elements(p_dishes) loop
    insert into story_dishes (story_id, menu_item_id, rating) values (sid, (d ->> 'menu_item_id')::uuid, (d ->> 'rating')::int);
  end loop;
  return sid;
end $$;

create or replace function update_dish_rating(p_story_dish_id uuid, p_rating integer) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare s stories%rowtype;
begin
  if p_rating not between 1 and 5 then perform app.fail('invalid_input'); end if;
  select st.* into s from story_dishes d join stories st on st.id = d.story_id where d.id = p_story_dish_id and st.author_id = auth.uid();
  if not found then perform app.fail('story_not_found'); end if;
  if s.created_at + make_interval(hours => app.setting_int('rating_edit_window_hours')::int) < now() then perform app.fail('rating_locked'); end if;
  update story_dishes set rating = p_rating where id = p_story_dish_id;
end $$;

create or replace function delete_story(p_story_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update stories set deleted_at = now() where id = p_story_id and author_id = auth.uid() and deleted_at is null;
  if not found then perform app.fail('story_not_found'); end if;
end $$;

-- Personal codes. Refusals are returned (not raised) so that the attempt is still logged for rate limits and fraud.
create or replace function issue_code(p_story_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid uuid := auth.uid();
  s stories%rowtype;
  o offers%rowtype;
  r restaurants%rowtype;
  attempts integer;
  cid uuid;
  sc text;
  tries integer := 0;
  exp timestamptz;
  reason text;
  remaining integer;
begin
  if uid is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;

  select count(*) into attempts from code_requests where user_id = uid and created_at > now() - interval '1 hour';
  if attempts >= app.setting_int('code_request_rate_limit_per_hour') then
    insert into code_requests (user_id, outcome) values (uid, 'code_rate_limited');
    insert into fraud_flags (kind, user_id, evidence, dedupe_key)
      values ('rapid_requests', uid, jsonb_build_object('requests_last_hour', attempts), 'rapid:' || uid || ':' || to_char(now(), 'YYYYMMDDHH24'))
      on conflict (dedupe_key) do nothing;
    return jsonb_build_object('ok', false, 'reason', 'code_rate_limited');
  end if;

  select * into s from stories where id = p_story_id and deleted_at is null and expires_at > now();
  if not found then
    insert into code_requests (user_id, outcome) values (uid, 'story_not_found');
    return jsonb_build_object('ok', false, 'reason', 'story_not_found');
  end if;

  reason := null;
  if s.author_id = uid then reason := 'code_is_author';
  elsif not app.are_friends(uid, s.author_id) then reason := 'code_not_friend';
  elsif s.offer_id is null then reason := 'offer_ended';
  end if;
  if reason is not null then
    insert into code_requests (user_id, restaurant_id, outcome) values (uid, s.restaurant_id, reason);
    return jsonb_build_object('ok', false, 'reason', reason);
  end if;

  -- Serialise on the offer row so that concurrent requests for the last codes cannot oversell.
  select * into o from offers where id = s.offer_id for update;
  select * into r from restaurants where id = o.restaurant_id;

  if r.status <> 'approved' then reason := 'restaurant_not_approved';
  elsif o.status <> 'active' then reason := 'offer_not_active';
  elsif now() >= o.ends_at then reason := 'offer_ended';
  elsif now() < o.starts_at or (o.drop_at is not null and now() < o.drop_at) then reason := 'offer_not_dropped';
  elsif not app.in_active_hours(o.active_hours, now()) then reason := 'offer_outside_hours';
  elsif exists (select 1 from redemptions x where x.customer_id = uid and x.restaurant_id = o.restaurant_id and x.status = 'verified')
     or exists (select 1 from visits v join visit_members m on m.visit_id = v.id
                where m.user_id = uid and v.restaurant_id = o.restaurant_id and v.status = 'verified') then
    reason := 'code_not_new_customer';
  elsif exists (select 1 from codes c where c.holder_id = uid and c.restaurant_id = o.restaurant_id and c.status = 'issued' and c.expires_at > now()) then
    reason := 'code_already_held';
  elsif o.codes_issued >= o.total_codes then reason := 'offer_sold_out';
  end if;
  if reason is not null then
    insert into code_requests (user_id, restaurant_id, outcome) values (uid, o.restaurant_id, reason);
    return jsonb_build_object('ok', false, 'reason', reason, 'offer_id', o.id);
  end if;

  -- Free any expired-but-unmarked code that still occupies this holder's unique slot.
  update codes set status = 'expired' where holder_id = uid and restaurant_id = o.restaurant_id and status = 'issued' and expires_at <= now();

  exp := least(now() + make_interval(hours => app.setting_int('code_lifetime_hours')::int), o.ends_at);
  loop
    tries := tries + 1;
    sc := lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into codes (offer_id, restaurant_id, story_id, referrer_id, holder_id, short_code, expires_at)
      values (o.id, o.restaurant_id, s.id, s.author_id, uid, sc, exp) returning id into cid;
      exit;
    exception when unique_violation then
      if exists (select 1 from codes c where c.holder_id = uid and c.restaurant_id = o.restaurant_id and c.status = 'issued') then
        insert into code_requests (user_id, restaurant_id, outcome) values (uid, o.restaurant_id, 'code_already_held');
        return jsonb_build_object('ok', false, 'reason', 'code_already_held');
      end if;
      if tries > 60 then perform app.fail('offer_sold_out'); end if;
    end;
  end loop;

  update offers set codes_issued = codes_issued + 1 where id = o.id returning total_codes - codes_issued into remaining;
  delete from offer_waitlist where offer_id = o.id and user_id = uid;
  insert into code_requests (user_id, restaurant_id, outcome) values (uid, o.restaurant_id, 'issued');
  return jsonb_build_object('ok', true, 'code', jsonb_build_object('id', cid, 'short_code', sc, 'offer_id', o.id,
    'restaurant_id', o.restaurant_id, 'expires_at', exp), 'remaining', remaining);
end $$;

create or replace function join_waitlist(p_offer_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null or not app.is_active_user() then perform app.fail('not_authenticated'); end if;
  if not exists (select 1 from offers o join restaurants r on r.id = o.restaurant_id where o.id = p_offer_id and o.status = 'active' and r.status = 'approved') then
    perform app.fail('offer_not_active');
  end if;
  if exists (select 1 from offer_waitlist where offer_id = p_offer_id and user_id = auth.uid()) then perform app.fail('waitlist_already_joined'); end if;
  insert into offer_waitlist (offer_id, user_id) values (p_offer_id, auth.uid());
end $$;

-- Redemption.
create or replace function app.refuse_redeem(rid uuid, short text, reason text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into redemption_attempts (restaurant_id, cashier_id, short_code, outcome) values (rid, auth.uid(), short, reason);
  return jsonb_build_object('ok', false, 'reason', reason);
end $$;
revoke all on function app.refuse_redeem(uuid, text, text) from public, anon, authenticated;

create or replace function app.find_code(p_restaurant_id uuid, p_short text, p_code_id uuid, lock_row boolean) returns codes
language plpgsql security definer set search_path = public, extensions as $$
declare c codes%rowtype;
begin
  if p_code_id is not null then
    if lock_row then select * into c from codes where id = p_code_id for update; else select * into c from codes where id = p_code_id; end if;
  else
    if lock_row then
      select * into c from codes where restaurant_id = p_restaurant_id and short_code = p_short order by (status = 'issued') desc, issued_at desc limit 1 for update;
    else
      select * into c from codes where restaurant_id = p_restaurant_id and short_code = p_short order by (status = 'issued') desc, issued_at desc limit 1;
    end if;
  end if;
  return c;
end $$;
revoke all on function app.find_code(uuid, text, uuid, boolean) from public, anon, authenticated;

create or replace function app.code_refusal(c codes, p_restaurant_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if c.id is null then return 'code_invalid'; end if;
  if c.restaurant_id <> p_restaurant_id then return 'code_wrong_restaurant'; end if;
  if c.status = 'redeemed' then return 'code_used'; end if;
  if c.status = 'void' then return 'code_void'; end if;
  if c.status = 'expired' or c.expires_at <= now() then return 'code_expired'; end if;
  return null;
end $$;
revoke all on function app.code_refusal(codes, uuid) from public, anon, authenticated;

create or replace function lookup_code(p_restaurant_id uuid, p_short_code text, p_code_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c codes%rowtype; reason text; o offers%rowtype; cust profiles%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager', 'cashier']);
  c := app.find_code(p_restaurant_id, p_short_code, p_code_id, false);
  reason := app.code_refusal(c, p_restaurant_id);
  if reason is not null then return app.refuse_redeem(p_restaurant_id, p_short_code, reason); end if;
  select * into o from offers where id = c.offer_id;
  select * into cust from profiles where id = c.holder_id;
  return jsonb_build_object('ok', true, 'code_id', c.id, 'customer_name', cust.name, 'offer', jsonb_build_object('id', o.id, 'title', o.title,
    'discount_percent', o.discount_percent, 'discount_cap_paise', o.discount_cap_paise, 'min_bill_paise', o.min_bill_paise), 'expires_at', c.expires_at);
end $$;

create or replace function redeem_code(p_restaurant_id uuid, p_short_code text, p_code_id uuid, p_bill_paise bigint,
  p_idempotency_key text, p_bill_photo_path text default null, p_visit_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c codes%rowtype;
  o offers%rowtype;
  r restaurants%rowtype;
  existing redemptions%rowtype;
  reason text;
  calc jsonb;
  red_id uuid;
  failures integer;
  vid uuid := null;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager', 'cashier']);
  if p_bill_paise is null or p_bill_paise < 1 or p_bill_paise > 100000000 or length(coalesce(p_idempotency_key, '')) < 8 then perform app.fail('invalid_input'); end if;

  select * into existing from redemptions where restaurant_id = p_restaurant_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'replayed', true, 'redemption_id', existing.id, 'status', existing.status,
      'bill_paise', existing.bill_paise, 'discount_paise', existing.discount_paise, 'fee_paise', existing.fee_paise,
      'customer_pays_paise', existing.bill_paise - existing.discount_paise,
      'restaurant_keeps_paise', existing.bill_paise - existing.discount_paise - existing.fee_paise);
  end if;

  select count(*) into failures from redemption_attempts where cashier_id = auth.uid() and created_at > now() - interval '10 minutes';
  if failures >= app.setting_int('failed_code_limit_per_10min') then
    insert into fraud_flags (kind, restaurant_id, evidence, dedupe_key)
      values ('failed_codes', p_restaurant_id, jsonb_build_object('cashier_id', auth.uid(), 'failed_attempts', failures),
        'failed:' || auth.uid() || ':' || to_char(now(), 'YYYYMMDDHH24MI'))
      on conflict (dedupe_key) do nothing;
    return jsonb_build_object('ok', false, 'reason', 'code_rate_limited');
  end if;

  c := app.find_code(p_restaurant_id, p_short_code, p_code_id, true);
  reason := app.code_refusal(c, p_restaurant_id);
  if reason = 'code_expired' and c.status = 'issued' then update codes set status = 'expired' where id = c.id; end if;
  if reason is not null then return app.refuse_redeem(p_restaurant_id, p_short_code, reason); end if;

  select * into o from offers where id = c.offer_id;
  select * into r from restaurants where id = p_restaurant_id;
  if r.status <> 'approved' then return app.refuse_redeem(p_restaurant_id, p_short_code, 'restaurant_not_approved'); end if;
  calc := app.compute_redemption(p_bill_paise, o.discount_percent, o.discount_cap_paise, o.min_bill_paise, r.fee_percent);
  if (calc ->> 'below_minimum')::boolean then return app.refuse_redeem(p_restaurant_id, p_short_code, 'bill_below_minimum'); end if;

  if p_visit_id is not null then
    select id into vid from visits where id = p_visit_id and restaurant_id = p_restaurant_id and status = 'open'
      and exists (select 1 from visit_members m where m.visit_id = id and m.user_id = c.holder_id);
    if vid is null then return app.refuse_redeem(p_restaurant_id, p_short_code, 'visit_not_open'); end if;
  end if;

  insert into redemptions (code_id, restaurant_id, offer_id, visit_id, customer_id, cashier_id, idempotency_key, bill_paise,
    discount_paise, fee_paise, fee_percent, bill_photo_path)
  values (c.id, p_restaurant_id, o.id, vid, c.holder_id, auth.uid(), p_idempotency_key, p_bill_paise,
    (calc ->> 'discount_paise')::bigint, (calc ->> 'fee_paise')::bigint, r.fee_percent, p_bill_photo_path)
  returning id into red_id;
  update codes set status = 'redeemed', redeemed_at = now() where id = c.id;
  if vid is not null then update visits set status = 'billed' where id = vid; end if;
  return calc || jsonb_build_object('ok', true, 'replayed', false, 'redemption_id', red_id, 'status', 'pending',
    'undo_until', now() + make_interval(mins => app.setting_int('undo_window_minutes')::int));
end $$;

-- Verification accrues the fee and creates held referral credits.
create or replace function app.verify_redemption(p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  rd redemptions%rowtype;
  c codes%rowtype;
  o offers%rowtype;
  fee_gst bigint;
  hold integer := app.setting_int('reward_hold_days')::int;
  member uuid;
  credits integer := 0;
  cap integer;
  period date;
begin
  select * into rd from redemptions where id = p_id for update;
  if not found or rd.status <> 'pending' then return; end if;
  select * into c from codes where id = rd.code_id;
  select * into o from offers where id = rd.offer_id;

  update redemptions set status = 'verified', verified_at = now() where id = rd.id;
  period := date_trunc('month', now() at time zone 'Asia/Kolkata')::date;
  fee_gst := round(rd.fee_paise * app.setting_int('gst_percent') / 100.0)::bigint;
  insert into fee_ledger (restaurant_id, redemption_id, kind, fee_paise, gst_paise, period, description)
  values (rd.restaurant_id, rd.id, 'referral_fee', rd.fee_paise, fee_gst, period, 'Referral fee');

  if rd.visit_id is not null then update visits set status = 'verified' where id = rd.visit_id; end if;
  update stories set verified = true where author_id = rd.customer_id and restaurant_id = rd.restaurant_id
    and created_at > rd.created_at - make_interval(mins => app.setting_int('checkin_window_minutes')::int) and deleted_at is null;

  if c.referrer_id is not null then
    cap := case when rd.visit_id is null then 1 else o.group_credit_cap end;
    for member in
      select u from (
        select rd.customer_id as u, 0 as ord
        union all
        select m.user_id, 1 from visit_members m where m.visit_id = rd.visit_id and m.user_id <> rd.customer_id
      ) t
      where u <> c.referrer_id
        and not exists (select 1 from redemptions x where x.customer_id = u and x.restaurant_id = rd.restaurant_id and x.status = 'verified' and x.id <> rd.id)
        and not exists (select 1 from visits v join visit_members vm on vm.visit_id = v.id
          where vm.user_id = u and v.restaurant_id = rd.restaurant_id and v.status = 'verified' and v.id is distinct from rd.visit_id)
      order by ord
    loop
      exit when credits >= cap;
      insert into referral_credits (referrer_id, restaurant_id, redemption_id, member_id, release_at)
      values (c.referrer_id, rd.restaurant_id, rd.id, member, now() + make_interval(days => hold));
      credits := credits + 1;
    end loop;
    if credits > 0 then
      perform app.notify(c.referrer_id, 'friend_redeemed', jsonb_build_object(
        'friend', coalesce((select name from profiles where id = rd.customer_id), ''),
        'restaurant', (select name from restaurants where id = rd.restaurant_id)));
    end if;
  end if;
end $$;
revoke all on function app.verify_redemption(uuid) from public, anon, authenticated;

create or replace function verify_redemption(p_redemption_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare rid uuid;
begin
  select restaurant_id into rid from redemptions where id = p_redemption_id;
  if rid is null then perform app.fail('redemption_not_found'); end if;
  perform app.require_restaurant_role(rid, array['owner', 'manager']);
  perform app.verify_redemption(p_redemption_id);
end $$;

create or replace function app.verify_due_redemptions() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare r record; n integer := 0;
begin
  for r in select id from redemptions where status = 'pending'
    and created_at <= now() - make_interval(mins => app.setting_int('undo_window_minutes')::int) order by created_at loop
    perform app.verify_redemption(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.verify_due_redemptions() from public, anon, authenticated;

create or replace function reverse_redemption(p_redemption_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  rd redemptions%rowtype;
  role text;
  in_window boolean;
  c codes%rowtype;
  is_platform boolean := false;
  reason text := btrim(coalesce(p_reason, ''));
begin
  select * into rd from redemptions where id = p_redemption_id for update;
  if not found then perform app.fail('redemption_not_found'); end if;
  if rd.status = 'reversed' then perform app.fail('redemption_already_reversed'); end if;
  if rd.status <> 'pending' and rd.status <> 'verified' then perform app.fail('redemption_not_verified'); end if;

  role := app.restaurant_role(rd.restaurant_id);
  if role is null then
    is_platform := app.has_permission('redemptions.reverse');
    if not is_platform then perform app.fail('not_permitted'); end if;
  end if;

  in_window := rd.created_at > now() - make_interval(mins => app.setting_int('undo_window_minutes')::int);
  if role = 'cashier' and not (in_window and rd.status = 'pending') then perform app.fail('undo_window_passed'); end if;
  if not (role = 'cashier' and in_window) and length(reason) < 5 then perform app.fail('invalid_input'); end if;

  if exists (select 1 from fee_ledger where redemption_id = rd.id and status = 'invoiced') then perform app.fail('redemption_invoiced'); end if;

  update redemptions set status = 'reversed', reversal_reason = coalesce(nullif(reason, ''), 'Undo'), reversed_by = auth.uid(), reversed_at = now() where id = rd.id;
  update fee_ledger set status = 'void' where redemption_id = rd.id;
  update referral_credits set status = 'void' where redemption_id = rd.id and status in ('held', 'released');

  select * into c from codes where id = rd.code_id;
  if rd.status = 'pending' and in_window and c.expires_at > now()
     and not exists (select 1 from codes x where x.holder_id = c.holder_id and x.restaurant_id = c.restaurant_id and x.status = 'issued') then
    update codes set status = 'issued', redeemed_at = null where id = c.id;
  else
    update codes set status = 'void' where id = c.id;
  end if;
  if rd.visit_id is not null then update visits set status = 'open' where id = rd.visit_id and status in ('billed', 'verified'); end if;
  perform app.audit('redemption', rd.id::text, 'reverse', jsonb_build_object('status', rd.status), jsonb_build_object('reason', reason));
end $$;

-- Rewards.
create or replace function app.evaluate_rewards(uid uuid, rid uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare released integer; lvl record; added integer;
begin
  select count(*) into released from referral_credits where referrer_id = uid and restaurant_id = rid and status = 'released';
  for lvl in select * from reward_levels where restaurant_id = rid and is_active and friends_required <= released order by friends_required loop
    insert into user_rewards (user_id, restaurant_id, level_id, status) values (uid, rid, lvl.id, 'available') on conflict (user_id, level_id) do nothing;
    get diagnostics added = row_count;
    if added > 0 then
      perform app.notify(uid, 'reward_unlocked', jsonb_build_object('reward', lvl.label, 'restaurant', (select name from restaurants where id = rid)));
    end if;
  end loop;
end $$;
revoke all on function app.evaluate_rewards(uuid, uuid) from public, anon, authenticated;

create or replace function app.release_held_credits() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare r record; n integer := 0;
begin
  for r in
    with rel as (
      update referral_credits set status = 'released', released_at = now()
      where status = 'held' and release_at <= now()
        and exists (select 1 from redemptions x where x.id = redemption_id and x.status = 'verified')
      returning referrer_id, restaurant_id
    ) select distinct referrer_id, restaurant_id from rel
  loop
    perform app.evaluate_rewards(r.referrer_id, r.restaurant_id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.release_held_credits() from public, anon, authenticated;

create or replace function claim_reward(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ur user_rewards%rowtype; lvl reward_levels%rowtype;
begin
  select * into ur from user_rewards where id = p_reward_id and user_id = auth.uid() for update;
  if not found or ur.status <> 'available' then perform app.fail('reward_not_available'); end if;
  update user_rewards set claimed_at = coalesce(claimed_at, now()) where id = ur.id;
  select * into lvl from reward_levels where id = ur.level_id;
  return jsonb_build_object('id', ur.id, 'restaurant_id', ur.restaurant_id, 'label', lvl.label, 'type', lvl.type, 'value', lvl.value);
end $$;

create or replace function mark_reward_used(p_reward_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare ur user_rewards%rowtype;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  select * into ur from user_rewards where id = p_reward_id for update;
  if not found then perform app.fail('reward_not_available'); end if;
  if not app.is_restaurant_member(ur.restaurant_id, array['owner', 'manager', 'cashier']) then perform app.fail('reward_wrong_restaurant'); end if;
  if ur.status <> 'available' then perform app.fail('reward_not_available'); end if;
  update user_rewards set status = 'used', used_at = now() where id = ur.id;
end $$;

grant execute on function check_in(uuid, double precision, double precision), post_story(uuid, text, text, jsonb),
  update_dish_rating(uuid, integer), delete_story(uuid), issue_code(uuid), join_waitlist(uuid),
  lookup_code(uuid, text, uuid), redeem_code(uuid, text, uuid, bigint, text, text, uuid), verify_redemption(uuid),
  reverse_redemption(uuid, text), claim_reward(uuid), mark_reward_used(uuid) to authenticated;
