-- Invoicing, payments, privacy requests, platform team, fraud detection and scheduled jobs.

-- Invoices: one per restaurant per month, sequential numbers, GST taken from the ledger lines.
create or replace function app.generate_invoices(p_period date) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  n integer := 0;
  seq bigint;
  inv_id uuid;
  sub bigint;
  tax bigint;
  gst_pct integer := app.setting_int('gst_percent')::int;
  prefix text := app.setting_text('invoice_prefix');
begin
  perform 1 from platform_settings where key = 'invoice_next_number' for update;
  for r in
    select restaurant_id, sum(fee_paise)::bigint as fees, sum(gst_paise)::bigint as gst from fee_ledger
    where status = 'accrued' and period = date_trunc('month', p_period)::date and invoice_id is null
      and not exists (select 1 from invoices i where i.restaurant_id = fee_ledger.restaurant_id and i.period = date_trunc('month', p_period)::date)
    group by restaurant_id having sum(fee_paise) > 0
    order by restaurant_id
  loop
    seq := app.setting_int('invoice_next_number');
    sub := r.fees;
    tax := r.gst;
    insert into invoices (restaurant_id, number, period, subtotal_paise, gst_paise, total_paise, gst_percent, due_at)
    values (r.restaurant_id, prefix || '-' || lpad(seq::text, 6, '0'), date_trunc('month', p_period)::date, sub, tax, sub + tax, gst_pct,
      now() + make_interval(days => app.setting_int('invoice_due_days')::int))
    returning id into inv_id;
    update fee_ledger set status = 'invoiced', invoice_id = inv_id
      where restaurant_id = r.restaurant_id and status = 'accrued' and period = date_trunc('month', p_period)::date and invoice_id is null;
    update platform_settings set value = to_jsonb(seq + 1), updated_at = now() where key = 'invoice_next_number';
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.generate_invoices(date) from public, anon, authenticated;

create or replace function generate_invoices(p_period date) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  perform app.require_permission('billing.manage');
  n := app.generate_invoices(p_period);
  perform app.audit('invoice', to_char(p_period, 'YYYY-MM'), 'generate', null, jsonb_build_object('count', n));
  return n;
end $$;

create or replace function app.run_monthly_invoices() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if extract(day from today)::int <> app.setting_int('invoice_day_of_month') then return 0; end if;
  return app.generate_invoices((date_trunc('month', today) - interval '1 month')::date);
end $$;
revoke all on function app.run_monthly_invoices() from public, anon, authenticated;

create or replace function app.settle_invoice(p_invoice_id uuid, p_reference text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare i invoices%rowtype;
begin
  select * into i from invoices where id = p_invoice_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  if i.status = 'paid' then return false; end if;
  update invoices set status = 'paid', paid_at = now(), bank_reference = p_reference where id = i.id;
  return true;
end $$;
revoke all on function app.settle_invoice(uuid, text) from public, anon, authenticated;

create or replace function mark_invoice_paid(p_invoice_id uuid, p_bank_reference text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('billing.manage');
  if length(btrim(coalesce(p_bank_reference, ''))) < 3 then perform app.fail('invalid_input'); end if;
  if not app.settle_invoice(p_invoice_id, btrim(p_bank_reference)) then perform app.fail('invoice_already_paid'); end if;
  perform app.audit('invoice', p_invoice_id::text, 'mark_paid', null, jsonb_build_object('reference', p_bank_reference));
end $$;

-- Called by the signed Razorpay webhook (service role only). Idempotent on the provider event id.
create or replace function record_payment_event(p_event_id text, p_payment_link_id text, p_payload jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare inv uuid;
begin
  select id into inv from invoices where payment_link_id = p_payment_link_id;
  insert into payment_events (id, invoice_id, payload) values (p_event_id, inv, p_payload) on conflict (id) do nothing;
  if not found then return false; end if;
  if inv is null then return false; end if;
  return app.settle_invoice(inv, 'razorpay:' || p_event_id);
end $$;
revoke all on function record_payment_event(text, text, jsonb) from public, anon, authenticated;
grant execute on function record_payment_event(text, text, jsonb) to service_role;

create or replace function set_invoice_payment_link(p_invoice_id uuid, p_url text, p_link_id text) returns void
language sql security definer set search_path = public, extensions as $$
  update invoices set payment_link = p_url, payment_link_id = p_link_id where id = p_invoice_id and status <> 'paid';
$$;
revoke all on function set_invoice_payment_link(uuid, text, text) from public, anon, authenticated;
grant execute on function set_invoice_payment_link(uuid, text, text) to service_role;

create or replace function app.mark_overdue_invoices() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  update invoices set status = 'overdue' where status = 'issued' and due_at < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function app.mark_overdue_invoices() from public, anon, authenticated;

create or replace function invoice_detail(p_invoice_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare i invoices%rowtype;
begin
  select * into i from invoices where id = p_invoice_id;
  if not found or not (app.is_restaurant_member(i.restaurant_id, array['owner']) or app.has_permission('billing.view')) then perform app.fail('not_permitted'); end if;
  return jsonb_build_object('invoice', to_jsonb(i),
    'restaurant', (select jsonb_build_object('name', name, 'address', address) from restaurants where id = i.restaurant_id),
    'company', jsonb_build_object('legal_name', app.setting('company_legal_name'), 'gstin', app.setting('company_gstin'),
      'address', app.setting('company_address'), 'state_code', app.setting('company_state_code'), 'sac', app.setting('sac_code'),
      'bank', app.setting('bank_details'), 'upi', app.setting('company_upi_id')),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'description', description, 'count', cnt, 'fee_paise', fee, 'gst_paise', gst))
      from (select kind, case when kind = 'boost_fee' then 'Boost ' || coalesce(boost_id::text, '') else 'Referral fees' end as description,
        count(*) cnt, sum(fee_paise) fee, sum(gst_paise) gst from fee_ledger where invoice_id = i.id group by kind, boost_id) l), '[]'::jsonb));
end $$;

-- Rows for the accountant, with GST columns.
create or replace function accountant_export(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('billing.view');
  return coalesce((select jsonb_agg(jsonb_build_object('invoice_number', i.number, 'issued_on', (i.created_at at time zone 'Asia/Kolkata')::date,
    'restaurant', r.name, 'sac', app.setting('sac_code'), 'taxable_paise', i.subtotal_paise, 'gst_percent', i.gst_percent,
    'gst_paise', i.gst_paise, 'total_paise', i.total_paise, 'status', i.status, 'bank_reference', i.bank_reference) order by i.number)
    from invoices i join restaurants r on r.id = i.restaurant_id
    where (i.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to), '[]'::jsonb);
end $$;

-- Boost fees accrue per active day, so pausing stops charges from that day. A boost is never charged per visit.
create or replace function app.accrue_boost_fees() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date; b record; n integer := 0; gst bigint;
begin
  for b in select * from sponsored_placements where status = 'active' and (starts_at at time zone 'Asia/Kolkata')::date <= today
    and (ends_at at time zone 'Asia/Kolkata')::date >= today loop
    gst := round(b.price_per_day_paise * app.setting_int('gst_percent') / 100.0)::bigint;
    insert into fee_ledger (restaurant_id, boost_id, kind, fee_paise, gst_paise, period, charge_date, description)
    values (b.restaurant_id, b.id, 'boost_fee', b.price_per_day_paise, gst, date_trunc('month', today)::date, today, 'Boost')
    on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  update sponsored_placements set status = 'ended' where status in ('active', 'paused') and ends_at < now();
  return n;
end $$;
revoke all on function app.accrue_boost_fees() from public, anon, authenticated;

-- Privacy: export and deletion.
create or replace function request_data_export() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); payload jsonb;
begin
  if uid is null then perform app.fail('not_authenticated'); end if;
  payload := jsonb_build_object(
    'profile', (select to_jsonb(p) - 'id' from profiles p where id = uid),
    'stories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'restaurant_id', restaurant_id, 'caption', caption, 'created_at', created_at)) from stories where author_id = uid), '[]'::jsonb),
    'codes', coalesce((select jsonb_agg(jsonb_build_object('restaurant_id', restaurant_id, 'status', status, 'issued_at', issued_at)) from codes where holder_id = uid), '[]'::jsonb),
    'redemptions', coalesce((select jsonb_agg(jsonb_build_object('restaurant_id', restaurant_id, 'bill_paise', bill_paise, 'discount_paise', discount_paise, 'status', status, 'created_at', created_at)) from redemptions where customer_id = uid), '[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('restaurant_id', restaurant_id, 'status', status)) from user_rewards where user_id = uid), '[]'::jsonb),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('handle', p.handle, 'name', p.name, 'status', f.status))
      from friendships f join profiles p on p.id = case when f.requester_id = uid then f.addressee_id else f.requester_id end
      where f.requester_id = uid or f.addressee_id = uid), '[]'::jsonb),
    'consents', coalesce((select jsonb_agg(jsonb_build_object('document', document, 'version', version, 'action', action, 'at', accepted_at)) from consent_log where user_id = uid), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'body', body, 'created_at', created_at)) from notifications where user_id = uid), '[]'::jsonb));
  insert into data_requests (user_id, kind, status, due_at, payload, fulfilled_at)
  values (uid, 'export', 'fulfilled', now() + make_interval(days => app.setting_int('data_request_due_days')::int), payload, now());
  return payload;
end $$;

create or replace function delete_account() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform app.fail('not_authenticated'); end if;
  if exists (select 1 from restaurant_staff where user_id = uid and role = 'owner') then perform app.fail('not_permitted'); end if;
  update profiles set deleted_at = now() where id = uid and deleted_at is null;
  if not found then return; end if;
  update codes set status = 'void' where holder_id = uid and status = 'issued';
  update stories set deleted_at = now() where author_id = uid and deleted_at is null;
  delete from push_tokens where user_id = uid;
  delete from contact_hashes where user_id = uid;
  delete from device_ids where user_id = uid;
  delete from offer_waitlist where user_id = uid;
  delete from friendships where requester_id = uid or addressee_id = uid;
  delete from poll_votes where user_id = uid;
  insert into data_requests (user_id, kind, due_at) values (uid, 'delete', now() + make_interval(days => app.setting_int('anonymise_delay_days')::int));
end $$;

create or replace function app.anonymise_deleted_accounts() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  with gone as (
    update profiles set name = 'Deleted user', handle = null, phone = null, avatar_path = null, city_id = null, anonymised_at = now()
    where deleted_at is not null and anonymised_at is null
      and deleted_at < now() - make_interval(days => app.setting_int('anonymise_delay_days')::int)
    returning id
  ), d1 as (delete from notifications where user_id in (select id from gone)),
     d2 as (delete from consent_log where user_id in (select id from gone)),
     d3 as (update data_requests set status = 'fulfilled', fulfilled_at = now() where kind = 'delete' and user_id in (select id from gone) returning 1)
  select count(*) into n from gone;
  return n;
end $$;
revoke all on function app.anonymise_deleted_accounts() from public, anon, authenticated;

create or replace function fulfil_data_request(p_request_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('data_requests.manage');
  if p_status not in ('fulfilled', 'rejected') then perform app.fail('invalid_input'); end if;
  update data_requests set status = p_status, fulfilled_by = auth.uid(), fulfilled_at = now() where id = p_request_id and status = 'open';
  if not found then perform app.fail('invalid_input'); end if;
  perform app.audit('data_request', p_request_id::text, p_status, null, null);
end $$;

-- Platform team.
create or replace function save_admin_role(p_id uuid, p_name text, p_permissions text[]) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare rid uuid := p_id;
begin
  perform app.require_permission('team.manage');
  if length(btrim(p_name)) < 2 then perform app.fail('invalid_input'); end if;
  if rid is null then
    insert into admin_roles (name) values (btrim(p_name)) returning id into rid;
  else
    if exists (select 1 from admin_roles where id = rid and is_system) then perform app.fail('not_permitted'); end if;
    update admin_roles set name = btrim(p_name) where id = rid;
  end if;
  delete from role_permissions where role_id = rid;
  insert into role_permissions (role_id, permission) select rid, p from unnest(p_permissions) p;
  perform app.audit('admin_role', rid::text, 'save', null, jsonb_build_object('name', p_name, 'permissions', p_permissions));
  return rid;
end $$;

create or replace function invite_admin(p_email text, p_role_id uuid) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare iid uuid;
begin
  perform app.require_permission('team.manage');
  insert into admin_invites (email, role_id, invited_by) values (lower(btrim(p_email)), p_role_id, auth.uid()) returning id into iid;
  perform app.audit('admin_invite', iid::text, 'invite', null, jsonb_build_object('email', lower(btrim(p_email)), 'role_id', p_role_id));
  return iid;
end $$;

create or replace function claim_admin_invite(p_name text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare mail text; inv admin_invites%rowtype;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  select lower(email) into mail from auth.users where id = auth.uid();
  select * into inv from admin_invites where accepted_at is null and email = mail order by created_at limit 1;
  if not found then return false; end if;
  insert into admin_users (user_id, role_id, name, email) values (auth.uid(), inv.role_id, btrim(p_name), mail) on conflict (user_id) do nothing;
  update admin_invites set accepted_at = now() where id = inv.id;
  return true;
end $$;

create or replace function sync_mfa() returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare enrolled boolean;
begin
  if not app.is_platform_staff() then perform app.fail('not_permitted'); end if;
  select exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified') into enrolled;
  update admin_users set mfa_enrolled = enrolled where user_id = auth.uid();
  return enrolled;
end $$;

create or replace function set_admin_member(p_user_id uuid, p_role_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('team.manage');
  if p_user_id = auth.uid() then perform app.fail('not_permitted'); end if;
  update admin_users set role_id = p_role_id where user_id = p_user_id;
  perform app.audit('admin_user', p_user_id::text, 'set_role', null, jsonb_build_object('role_id', p_role_id));
end $$;

create or replace function revoke_admin_sessions(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('team.manage');
  delete from auth.sessions where user_id = p_user_id;
  perform app.audit('admin_user', p_user_id::text, 'revoke_sessions', null, null);
end $$;

-- Campaigns respect consent and the weekly alert limit through app.deliver.
create or replace function create_campaign(p_title text, p_body text, p_city uuid, p_active_within_days integer, p_scheduled_at timestamptz) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid;
begin
  perform app.require_permission('notifications.send');
  if length(btrim(p_title)) < 1 or length(btrim(p_body)) < 1 then perform app.fail('invalid_input'); end if;
  insert into campaigns (title, body, city_id, active_within_days, scheduled_at, created_by)
  values (btrim(p_title), btrim(p_body), p_city, p_active_within_days, coalesce(p_scheduled_at, now()), auth.uid()) returning id into cid;
  perform app.audit('campaign', cid::text, 'create', null, jsonb_build_object('title', p_title));
  return cid;
end $$;

create or replace function app.send_due_campaigns() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare c campaigns%rowtype; u record; n integer := 0; total integer;
begin
  for c in select * from campaigns where status = 'scheduled' and scheduled_at <= now() for update skip locked loop
    total := 0;
    for u in select p.id from profiles p
      where p.deleted_at is null and p.suspended_at is null and p.onboarding_done and p.marketing_consent
        and (c.city_id is null or p.city_id = c.city_id)
        and (c.active_within_days is null or exists (select 1 from code_requests r where r.user_id = p.id and r.created_at > now() - make_interval(days => c.active_within_days))
             or exists (select 1 from stories s where s.author_id = p.id and s.created_at > now() - make_interval(days => c.active_within_days)))
    loop
      perform app.deliver(u.id, 'campaign', c.title, c.body, jsonb_build_object('campaign_id', c.id), c.id);
      total := total + 1;
    end loop;
    update campaigns set status = 'sent', recipients = total where id = c.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.send_due_campaigns() from public, anon, authenticated;

-- Scheduled jobs.
create or replace function app.expire_items() returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update codes set status = 'expired' where status = 'issued' and expires_at <= now();
  update offers set status = 'ended' where status in ('active', 'paused') and ends_at <= now();
  update stories set deleted_at = now() where deleted_at is null and expires_at <= now();
end $$;
revoke all on function app.expire_items() from public, anon, authenticated;

create or replace function app.open_drops() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare w record; n integer := 0;
begin
  for w in
    select wl.offer_id, wl.user_id, r.name as restaurant from offer_waitlist wl
    join offers o on o.id = wl.offer_id join restaurants r on r.id = o.restaurant_id
    where wl.notified_at is null and o.status = 'active' and r.status = 'approved' and now() between o.starts_at and o.ends_at
      and (o.drop_at is null or o.drop_at <= now()) and o.codes_issued < o.total_codes
    for update of wl skip locked
  loop
    update offer_waitlist set notified_at = now() where offer_id = w.offer_id and user_id = w.user_id;
    perform app.notify(w.user_id, 'new_drop', jsonb_build_object('restaurant', w.restaurant));
    n := n + 1;
  end loop;
  for w in
    select c.id, c.holder_id, r.name as restaurant from codes c join restaurants r on r.id = c.restaurant_id
    where c.status = 'issued' and c.ending_notified_at is null
      and c.expires_at between now() and now() + make_interval(hours => app.setting_int('code_ending_soon_hours')::int)
  loop
    update codes set ending_notified_at = now() where id = w.id;
    perform app.notify(w.holder_id, 'code_ending_soon', jsonb_build_object('restaurant', w.restaurant));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.open_drops() from public, anon, authenticated;

create or replace function app.evaluate_badges() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  with counts as (
    select b.id as badge_id, m.user_id, case when b.scope = 'restaurant' then m.restaurant_id else null end as restaurant_id, count(*) as c, b.threshold
    from badge_definitions b
    join lateral (
      select s.author_id as user_id, s.restaurant_id from stories s where b.metric = 'stories_posted' and s.deleted_at is null
      union all
      select rc.referrer_id, rc.restaurant_id from referral_credits rc where b.metric = 'friends_redeemed' and rc.status in ('held', 'released')
      union all
      select x.customer_id, x.restaurant_id from redemptions x where b.metric = 'restaurants_visited' and x.status = 'verified'
      union all
      select s.author_id, s.restaurant_id from story_dishes d join stories s on s.id = d.story_id
        where b.metric = 'verified_ratings' and s.verified and s.deleted_at is null
    ) m on true
    where b.is_active
    group by b.id, m.user_id, case when b.scope = 'restaurant' then m.restaurant_id else null end, b.threshold
    having count(*) >= b.threshold
  ), ins as (
    insert into badge_awards (user_id, badge_id, restaurant_id)
    select c.user_id, c.badge_id, c.restaurant_id from counts c
    where exists (select 1 from profiles p where p.id = c.user_id and p.deleted_at is null)
    on conflict (user_id, badge_id, coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function app.evaluate_badges() from public, anon, authenticated;

create or replace function app.detect_fraud() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer := 0; k integer;
begin
  insert into fraud_flags (kind, evidence, dedupe_key)
  select 'device_cluster', jsonb_build_object('device_id', device_id, 'accounts', count(distinct user_id), 'user_ids', jsonb_agg(distinct user_id)), 'device:' || device_id
  from device_ids group by device_id having count(distinct user_id) >= app.setting_int('fraud_device_accounts_threshold')
  on conflict (dedupe_key) do nothing;
  get diagnostics k = row_count; n := n + k;

  insert into fraud_flags (kind, restaurant_id, evidence, dedupe_key)
  select 'bill_anomaly', r.restaurant_id, jsonb_build_object('avg_bill_paise', r.avg_bill, 'avg_menu_price_paise', m.avg_price, 'redemptions', r.cnt),
    'bill:' || r.restaurant_id || ':' || to_char(now(), 'YYYYMM')
  from (select restaurant_id, round(avg(bill_paise)) avg_bill, count(*) cnt from redemptions where status = 'verified' group by restaurant_id having count(*) >= 5) r
  join (select restaurant_id, round(avg(price_paise)) avg_price from menu_items where price_paise > 0 group by restaurant_id) m on m.restaurant_id = r.restaurant_id
  where r.avg_bill * 100 < m.avg_price * app.setting_int('fraud_bill_anomaly_percent')
  on conflict (dedupe_key) do nothing;
  get diagnostics k = row_count; n := n + k;
  return n;
end $$;
revoke all on function app.detect_fraud() from public, anon, authenticated;

create or replace function app.purge_logs() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare cutoff timestamptz := now() - make_interval(days => app.setting_int('log_retention_days')::int);
begin
  delete from notification_log where created_at < cutoff;
  delete from error_log where created_at < cutoff;
  delete from audit_log where created_at < cutoff;
  delete from code_requests where created_at < cutoff;
  delete from redemption_attempts where created_at < cutoff;
end $$;
revoke all on function app.purge_logs() from public, anon, authenticated;

grant execute on function generate_invoices(date), mark_invoice_paid(uuid, text), invoice_detail(uuid), accountant_export(date, date),
  request_data_export(), delete_account(), fulfil_data_request(uuid, text), save_admin_role(uuid, text, text[]),
  invite_admin(text, uuid), claim_admin_invite(text), sync_mfa(), set_admin_member(uuid, uuid), revoke_admin_sessions(uuid),
  create_campaign(text, text, uuid, integer, timestamptz) to authenticated;
