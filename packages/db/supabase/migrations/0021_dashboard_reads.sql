-- Read functions for the dashboards that join data the tables alone cannot express under row level security.

create or replace function my_permissions() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('user_id', u.user_id, 'name', u.name, 'email', u.email, 'role', r.name, 'is_system', r.is_system,
    'mfa_enrolled', u.mfa_enrolled,
    'permissions', coalesce((select jsonb_agg(p.permission) from role_permissions p where p.role_id = u.role_id), '[]'::jsonb))
  from admin_users u join admin_roles r on r.id = u.role_id where u.user_id = auth.uid();
$$;

create or replace function my_restaurants() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'status', r.status, 'role', s.role, 'review_note', r.review_note,
    'city_id', r.city_id, 'logo_path', r.logo_path, 'fee_percent', r.fee_percent, 'merchant_agreement_version', r.merchant_agreement_version)
    order by r.created_at), '[]'::jsonb)
  from restaurant_staff s join restaurants r on r.id = s.restaurant_id where s.user_id = auth.uid();
$$;

create or replace function list_staff(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not (app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view')) then perform app.fail('not_permitted'); end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'email', u.email, 'role', s.role) order by s.created_at)
      from restaurant_staff s join auth.users u on u.id = s.user_id where s.restaurant_id = p_restaurant_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role) order by i.created_at)
      from restaurant_invites i where i.restaurant_id = p_restaurant_id and i.accepted_at is null), '[]'::jsonb));
end $$;

create or replace function restaurant_recent_redemptions(p_restaurant_id uuid, p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) then perform app.fail('not_permitted'); end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select r.id, r.status, r.bill_paise, r.discount_paise, r.fee_paise, r.created_at, p.name as customer_name, o.title as offer_title
    from redemptions r join profiles p on p.id = r.customer_id join offers o on o.id = r.offer_id
    where r.restaurant_id = p_restaurant_id order by r.created_at desc limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

create or replace function restaurant_recent_ratings(p_restaurant_id uuid, p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner', 'manager']) then perform app.fail('not_permitted'); end if;
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select d.id, d.rating, d.created_at, m.name as dish, a.name as author, s.id as story_id
    from story_dishes d join stories s on s.id = d.story_id join menu_items m on m.id = d.menu_item_id join profiles a on a.id = s.author_id
    where s.restaurant_id = p_restaurant_id and s.verified and s.deleted_at is null
    order by d.created_at desc limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

create or replace function admin_redemptions(p_search text default null, p_limit integer default 25, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('redemptions.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select r.id, r.status, r.bill_paise, r.discount_paise, r.fee_paise, r.bill_photo_path, r.restaurant_id, r.created_at, r.reversal_reason,
      rs.name as restaurant, p.name as customer
    from redemptions r join restaurants rs on rs.id = r.restaurant_id join profiles p on p.id = r.customer_id
    where p_search is null or btrim(p_search) = '' or rs.name ilike '%' || btrim(p_search) || '%' or p.name ilike '%' || btrim(p_search) || '%'
    order by r.created_at desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

-- A random sample of verified redemptions for manual checks.
create or replace function admin_sample_redemptions(p_count integer default 10) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('redemptions.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select r.id, r.status, r.bill_paise, r.discount_paise, r.fee_paise, r.bill_photo_path, r.restaurant_id, r.created_at, r.reversal_reason,
      rs.name as restaurant, p.name as customer
    from redemptions r join restaurants rs on rs.id = r.restaurant_id join profiles p on p.id = r.customer_id
    where r.status = 'verified' order by random() limit least(greatest(p_count, 1), 50)) t), '[]'::jsonb);
end $$;

create or replace function moderation_queue(p_status text default 'open', p_limit integer default 25, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('moderation.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select rp.id, rp.status, rp.note, rp.created_at, rr.label as reason, s.id as story_id, s.caption, s.photo_path, s.deleted_at,
      a.name as author, rs.name as restaurant
    from reports rp join report_reasons rr on rr.id = rp.reason_id join stories s on s.id = rp.story_id
    join profiles a on a.id = s.author_id join restaurants rs on rs.id = s.restaurant_id
    where rp.status = p_status order by rr.label, rp.created_at desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

create or replace function admin_search_users(p_query text default null, p_limit integer default 25, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('users.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select id, name, handle, phone, suspended_at, deleted_at, created_at from profiles
    where p_query is null or btrim(p_query) = '' or name ilike '%' || btrim(p_query) || '%' or handle::text ilike '%' || btrim(p_query) || '%' or phone like '%' || btrim(p_query) || '%'
    order by created_at desc offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 100)) t), '[]'::jsonb);
end $$;

create or replace function admin_restaurant_overview(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('restaurants.view');
  return jsonb_build_object(
    'restaurant', (select to_jsonb(r) from restaurants r where r.id = p_restaurant_id),
    'owner_email', (select u.email from restaurants r join auth.users u on u.id = r.owner_id where r.id = p_restaurant_id),
    'menu_items', (select count(*) from menu_items where restaurant_id = p_restaurant_id),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'status', status, 'codes_issued', codes_issued, 'total_codes', total_codes)) from offers where restaurant_id = p_restaurant_id), '[]'::jsonb),
    'verified_redemptions', (select count(*) from redemptions where restaurant_id = p_restaurant_id and status = 'verified'),
    'fees_paise', coalesce((select sum(fee_paise) from fee_ledger where restaurant_id = p_restaurant_id and status <> 'void'), 0));
end $$;

create or replace function admin_restaurants(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('restaurants.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select r.id, r.name, r.status, r.fee_percent, r.created_at, c.name as city
    from restaurants r join cities c on c.id = r.city_id where p_status is null or r.status = p_status
    order by (r.status = 'pending') desc, r.created_at desc limit 200) t), '[]'::jsonb);
end $$;

create or replace function admin_offers(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('offers.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select o.id, o.title, o.status, o.discount_percent, o.discount_cap_paise, o.min_bill_paise, o.total_codes, o.codes_issued, o.ends_at,
      r.name as restaurant, o.restaurant_id
    from offers o join restaurants r on r.id = o.restaurant_id where p_status is null or o.status = p_status
    order by (o.status = 'pending_approval') desc, o.created_at desc limit 200) t), '[]'::jsonb);
end $$;

create or replace function admin_invoices(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('billing.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select i.id, i.number, i.period, i.subtotal_paise, i.gst_paise, i.total_paise, i.status, i.due_at, i.paid_at, i.bank_reference, i.payment_link, r.name as restaurant
    from invoices i join restaurants r on r.id = i.restaurant_id where p_status is null or i.status = p_status
    order by i.created_at desc limit 200) t), '[]'::jsonb);
end $$;

create or replace function admin_boosts(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('boosts.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select b.id, b.status, b.placement, b.starts_at, b.ends_at, b.price_paise, b.impressions, b.taps, b.codes_issued, b.redemptions, b.charged_paise,
      r.name as restaurant, c.name as city, o.title as offer
    from boost_report b join restaurants r on r.id = b.restaurant_id join cities c on c.id = b.city_id join offers o on o.id = b.offer_id
    where p_status is null or b.status = p_status order by (b.status = 'pending_approval') desc, b.starts_at desc limit 200) t), '[]'::jsonb);
end $$;

create or replace function admin_fraud_flags(p_status text default 'open') returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('fraud.view');
  return coalesce((select jsonb_agg(row_to_json(t)) from (
    select f.id, f.kind, f.status, f.evidence, f.created_at, f.user_id, f.restaurant_id, p.name as user_name, r.name as restaurant_name
    from fraud_flags f left join profiles p on p.id = f.user_id left join restaurants r on r.id = f.restaurant_id
    where f.status = p_status order by f.created_at desc limit 200) t), '[]'::jsonb);
end $$;

create or replace function admin_campaign_log() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('notifications.view');
  return jsonb_build_object(
    'campaigns', coalesce((select jsonb_agg(row_to_json(c)) from (select * from campaigns order by created_at desc limit 50) c), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(row_to_json(l)) from (select id, event, channel, status, created_at from notification_log order by created_at desc limit 100) l), '[]'::jsonb));
end $$;

create or replace function missing_translation_keys(p_locale text, p_keys text[]) returns text[]
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('content.view');
  return array(select k from unnest(p_keys) k where not exists (select 1 from translations t where t.key = k and t.locale = p_locale));
end $$;

create or replace function restaurant_billing_summary(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not app.is_restaurant_member(p_restaurant_id, array['owner']) then perform app.fail('not_permitted'); end if;
  return jsonb_build_object(
    'company', jsonb_build_object('bank', app.setting('bank_details'), 'upi', app.setting('company_upi_id')),
    'accrued_paise', coalesce((select sum(fee_paise + gst_paise) from fee_ledger where restaurant_id = p_restaurant_id and status = 'accrued'), 0));
end $$;

grant execute on function my_permissions(), my_restaurants(), list_staff(uuid), restaurant_recent_redemptions(uuid, integer),
  restaurant_recent_ratings(uuid, integer), admin_redemptions(text, integer, integer), admin_sample_redemptions(integer),
  moderation_queue(text, integer, integer), admin_search_users(text, integer, integer), admin_restaurant_overview(uuid),
  admin_restaurants(text), admin_offers(text), admin_invoices(text), admin_boosts(text), admin_fraud_flags(text),
  admin_campaign_log(), missing_translation_keys(text, text[]), restaurant_billing_summary(uuid) to authenticated;
