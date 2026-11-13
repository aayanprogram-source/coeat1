-- Restaurant dashboard support: calculator before saving, group visit at lookup, pending rewards, trends and alerts.

-- The offer form shows the maths before an offer exists, through the same function the redemption uses.
create or replace function calculate_redemption(p_restaurant_id uuid, p_discount_percent integer, p_cap_paise bigint,
  p_min_bill_paise bigint, p_bill_paise bigint) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare r restaurants%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if p_bill_paise is null or p_bill_paise < 1 or p_bill_paise > 100000000 then perform app.fail('invalid_input'); end if;
  select * into r from restaurants where id = p_restaurant_id;
  return app.compute_redemption(p_bill_paise, p_discount_percent, p_cap_paise, p_min_bill_paise, r.fee_percent);
end $$;

-- Lookup also reports the holder's open table at this restaurant so a group bill is linked automatically.
create or replace function lookup_code(p_restaurant_id uuid, p_short_code text, p_code_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c codes%rowtype; reason text; o offers%rowtype; cust profiles%rowtype; vid uuid;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager', 'cashier']);
  c := app.find_code(p_restaurant_id, p_short_code, p_code_id, false);
  reason := app.code_refusal(c, p_restaurant_id);
  if reason is not null then return app.refuse_redeem(p_restaurant_id, p_short_code, reason); end if;
  select * into o from offers where id = c.offer_id;
  select * into cust from profiles where id = c.holder_id;
  select v.id into vid from visits v join visit_members m on m.visit_id = v.id
    where v.restaurant_id = p_restaurant_id and v.status = 'open' and m.user_id = c.holder_id order by v.created_at desc limit 1;
  return jsonb_build_object('ok', true, 'code_id', c.id, 'customer_name', cust.name, 'visit_id', vid,
    'offer', jsonb_build_object('id', o.id, 'title', o.title, 'discount_percent', o.discount_percent,
      'discount_cap_paise', o.discount_cap_paise, 'min_bill_paise', o.min_bill_paise), 'expires_at', c.expires_at);
end $$;

-- Accepting the current documents also records the merchant agreement version on the owner's restaurants.
create or replace function accept_legal_documents(p_audience text default 'customer') returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer; latest legal_documents%rowtype;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  with pending as (
    select (e ->> 'kind') kind, (e ->> 'version')::int version
    from jsonb_array_elements(app.pending_legal_for(auth.uid(), p_audience)) e
  ), ins as (
    insert into consent_log (user_id, document, version, action)
    select auth.uid(), kind, version, 'accepted' from pending returning 1
  )
  select count(*) into n from ins;
  if p_audience = 'restaurant' then
    select * into latest from legal_documents where kind = 'merchant_agreement' and published_at is not null order by version desc limit 1;
    if found then
      update restaurants set merchant_agreement_version = latest.version, merchant_agreement_accepted_at = now()
        where owner_id = auth.uid() and coalesce(merchant_agreement_version, 0) < latest.version;
    end if;
  end if;
  return n;
end $$;

create or replace function restaurant_pending_rewards(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) then perform app.fail('not_permitted'); end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select ur.id, ur.claimed_at, ur.created_at, l.label, l.type, l.value, p.name as customer
    from user_rewards ur join reward_levels l on l.id = ur.level_id join profiles p on p.id = ur.user_id
    where ur.restaurant_id = p_restaurant_id and ur.status = 'available' order by ur.claimed_at nulls last, ur.created_at) t), '[]'::jsonb);
end $$;

create or replace function restaurant_rating_trend(p_restaurant_id uuid, p_days integer default 90) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) then perform app.fail('not_permitted'); end if;
  return coalesce((select jsonb_agg(row_to_json(t) order by t.day) from (
    select (d.created_at at time zone 'Asia/Kolkata')::date as day, round(avg(d.rating)::numeric, 2) as avg_rating, count(*)::int as ratings
    from story_dishes d join stories s on s.id = d.story_id
    where s.restaurant_id = p_restaurant_id and s.deleted_at is null and d.created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    group by 1) t), '[]'::jsonb);
end $$;

create or replace function restaurant_alerts(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) then perform app.fail('not_permitted'); end if;
  return jsonb_build_object(
    'low_codes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'remaining', o.total_codes - o.codes_issued))
      from offers o where o.restaurant_id = p_restaurant_id and o.status = 'active'
        and o.total_codes - o.codes_issued <= app.setting_int('low_stock_threshold')), '[]'::jsonb),
    'flagged', (select count(*) from fraud_flags f where f.restaurant_id = p_restaurant_id and f.status = 'open'));
end $$;

grant execute on function calculate_redemption(uuid, integer, bigint, bigint, bigint), lookup_code(uuid, text, uuid),
  accept_legal_documents(text), restaurant_pending_rewards(uuid), restaurant_rating_trend(uuid, integer), restaurant_alerts(uuid) to authenticated;
