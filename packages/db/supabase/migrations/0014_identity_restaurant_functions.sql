-- Identity, friends, restaurant lifecycle, menus, staff and offers.

-- Which document kinds each audience must have accepted at their latest published version.
create or replace function app.required_kinds(audience text) returns text[]
language sql immutable as $$
  select case audience
    when 'restaurant' then array['merchant_agreement', 'terms', 'privacy']
    else array['terms', 'privacy', 'rewards_policy', 'community_guidelines']
  end;
$$;

create or replace function app.pending_legal_for(uid uuid, audience text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', d.kind, 'version', d.version, 'title', d.title) order by d.kind), '[]'::jsonb)
  from (
    select distinct on (kind) kind, version, title from legal_documents
    where published_at is not null and kind = any (app.required_kinds(audience))
    order by kind, version desc
  ) d
  where not exists (
    select 1 from consent_log c
    where c.user_id = uid and c.document = d.kind and c.version = d.version and c.action = 'accepted'
  );
$$;
revoke all on function app.pending_legal_for(uuid, text) from public, anon, authenticated;

create or replace function pending_legal(p_audience text default 'customer') returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  return app.pending_legal_for(auth.uid(), p_audience);
end $$;

create or replace function accept_legal_documents(p_audience text default 'customer') returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
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
  return n;
end $$;

create or replace function complete_onboarding(p_name text, p_handle text, p_city_id uuid, p_age_confirmed boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if not p_age_confirmed then perform app.fail('age_not_confirmed'); end if;
  if length(btrim(p_name)) < 2 or length(p_name) > 50 or p_handle !~ '^[a-z0-9_]{3,24}$' then perform app.fail('invalid_input'); end if;
  if p_city_id is not null and not exists (select 1 from cities where id = p_city_id and is_active) then perform app.fail('invalid_input'); end if;
  if jsonb_array_length(app.pending_legal_for(auth.uid(), 'customer')) > 0 then perform app.fail('legal_not_accepted'); end if;
  if exists (select 1 from profiles where handle = p_handle and id <> auth.uid()) then perform app.fail('handle_taken'); end if;
  update profiles set name = btrim(p_name), handle = p_handle, city_id = p_city_id, age_confirmed = true,
    onboarding_done = true where id = auth.uid() and deleted_at is null;
  if not found then perform app.fail('account_deleted'); end if;
end $$;

create or replace function withdraw_consent(p_kind text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if p_kind = 'notifications' then
    update profiles set notifications_enabled = false where id = auth.uid();
  elsif p_kind = 'marketing' then
    update profiles set marketing_consent = false where id = auth.uid();
  else
    perform app.fail('invalid_input');
  end if;
  insert into consent_log (user_id, document, version, action) values (auth.uid(), p_kind, null, 'withdrawn');
end $$;

create or replace function give_consent(p_kind text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if p_kind = 'notifications' then
    update profiles set notifications_enabled = true where id = auth.uid();
  elsif p_kind = 'marketing' then
    update profiles set marketing_consent = true where id = auth.uid();
  else
    perform app.fail('invalid_input');
  end if;
  insert into consent_log (user_id, document, version, action) values (auth.uid(), p_kind, null, 'accepted');
end $$;

-- Contact matching uses SHA-256 hashes only; raw numbers never reach the database.
create or replace function sync_contacts(p_hashes text[]) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if coalesce(array_length(p_hashes, 1), 0) > 5000 then perform app.fail('invalid_input'); end if;
  insert into contact_hashes (user_id, phone_hash)
    select auth.uid(), h from unnest(p_hashes) h where h ~ '^[0-9a-f]{64}$' on conflict do nothing;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'avatar_path', p.avatar_path))
    from profiles p
    where p.id <> auth.uid() and p.deleted_at is null and p.suspended_at is null and p.handle is not null
      and encode(digest(p.phone, 'sha256'), 'hex') = any (p_hashes)
      and not exists (select 1 from friendships f where (f.requester_id = auth.uid() and f.addressee_id = p.id)
        or (f.addressee_id = auth.uid() and f.requester_id = p.id))
  ), '[]'::jsonb);
end $$;

create or replace function search_users(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if length(btrim(p_query)) < 3 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'handle', handle, 'avatar_path', avatar_path))
    from (select id, name, handle, avatar_path from profiles
      where handle is not null and deleted_at is null and suspended_at is null and id <> auth.uid()
        and handle::text ilike lower(btrim(p_query)) || '%' order by handle limit 20) s
  ), '[]'::jsonb);
end $$;

create or replace function send_friend_request(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if p_user_id = auth.uid() or not exists (select 1 from profiles where id = p_user_id and deleted_at is null) then perform app.fail('invalid_input'); end if;
  if exists (select 1 from friendships where status = 'blocked'
      and ((requester_id = p_user_id and addressee_id = auth.uid()) or (requester_id = auth.uid() and addressee_id = p_user_id))) then
    perform app.fail('not_permitted');
  end if;
  if exists (select 1 from friendships where (requester_id = auth.uid() and addressee_id = p_user_id)
      or (requester_id = p_user_id and addressee_id = auth.uid())) then
    perform app.fail('friend_request_exists');
  end if;
  insert into friendships (requester_id, addressee_id, status) values (auth.uid(), p_user_id, 'pending');
end $$;

create or replace function respond_friend_request(p_friendship_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare f friendships%rowtype;
begin
  select * into f from friendships where id = p_friendship_id and addressee_id = auth.uid() and status = 'pending' for update;
  if not found then perform app.fail('invalid_input'); end if;
  if p_accept then update friendships set status = 'accepted' where id = f.id;
  else delete from friendships where id = f.id;
  end if;
end $$;

create or replace function remove_friend(p_user_id uuid, p_block boolean default false) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  delete from friendships where (requester_id = auth.uid() and addressee_id = p_user_id) or (requester_id = p_user_id and addressee_id = auth.uid());
  if p_block then insert into friendships (requester_id, addressee_id, status) values (auth.uid(), p_user_id, 'blocked'); end if;
end $$;

create or replace function register_device(p_device_id text, p_platform text, p_push_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  insert into device_ids (user_id, device_id, platform) values (auth.uid(), p_device_id, p_platform)
    on conflict (user_id, device_id) do update set last_seen_at = now();
  if p_push_token is not null then
    insert into push_tokens (user_id, token, platform) values (auth.uid(), p_push_token, p_platform)
      on conflict (token) do update set user_id = auth.uid(), last_seen_at = now();
  end if;
end $$;

create or replace function log_client_error(p_source text, p_message text, p_detail jsonb default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return; end if;
  if (select count(*) from error_log where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then return; end if;
  insert into error_log (source, message, detail, user_id) values (left(p_source, 60), left(p_message, 500), p_detail, auth.uid());
end $$;

-- The one place money is computed. Preview and redemption both call this.
create or replace function app.compute_redemption(p_bill bigint, p_percent integer, p_cap bigint, p_min_bill bigint, p_fee_percent integer)
returns jsonb language sql immutable as $$
  with c as (
    select case when p_bill >= p_min_bill then least(round(p_bill * p_percent / 100.0)::bigint, p_cap) else 0 end as discount,
           round(p_bill * p_fee_percent / 100.0)::bigint as fee
  )
  select jsonb_build_object(
    'bill_paise', p_bill, 'below_minimum', p_bill < p_min_bill, 'discount_paise', c.discount, 'fee_paise', c.fee,
    'customer_pays_paise', p_bill - c.discount, 'restaurant_keeps_paise', p_bill - c.discount - c.fee)
  from c;
$$;

create or replace function preview_redemption(p_restaurant_id uuid, p_offer_id uuid, p_bill_paise bigint) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare o offers%rowtype; r restaurants%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager', 'cashier']);
  if p_bill_paise is null or p_bill_paise < 1 or p_bill_paise > 100000000 then perform app.fail('invalid_input'); end if;
  select * into o from offers where id = p_offer_id and restaurant_id = p_restaurant_id;
  if not found then perform app.fail('invalid_input'); end if;
  select * into r from restaurants where id = p_restaurant_id;
  return app.compute_redemption(p_bill_paise, o.discount_percent, o.discount_cap_paise, o.min_bill_paise, r.fee_percent);
end $$;

-- Restaurants.
create or replace function app.unique_slug(base text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare slug text := regexp_replace(lower(btrim(base)), '[^a-z0-9]+', '-', 'g'); candidate text; i integer := 0;
begin
  slug := trim(both '-' from slug);
  if slug = '' then slug := 'restaurant'; end if;
  candidate := slug;
  while exists (select 1 from restaurants where restaurants.slug = candidate) loop
    i := i + 1;
    candidate := slug || '-' || i;
  end loop;
  return candidate;
end $$;
revoke all on function app.unique_slug(text) from public, anon, authenticated;

create or replace function create_restaurant(p_details jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare rid uuid; fee integer := app.setting_int('fee_percent_default');
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if exists (select 1 from admin_users where user_id = auth.uid()) then perform app.fail('not_permitted'); end if;
  if length(btrim(coalesce(p_details ->> 'name', ''))) < 2 then perform app.fail('invalid_input'); end if;
  if not exists (select 1 from cities where id = (p_details ->> 'city_id')::uuid and is_active) then perform app.fail('invalid_input'); end if;
  insert into restaurants (owner_id, name, slug, city_id, cuisine_ids, address, lat, lng, phone, hours, upi_id, fee_percent)
  values (auth.uid(), btrim(p_details ->> 'name'), app.unique_slug(p_details ->> 'name'), (p_details ->> 'city_id')::uuid,
    coalesce(array(select jsonb_array_elements_text(p_details -> 'cuisine_ids'))::uuid[], '{}'),
    p_details ->> 'address', (p_details ->> 'lat')::float8, (p_details ->> 'lng')::float8, p_details ->> 'phone',
    coalesce(p_details -> 'hours', '{}'), nullif(p_details ->> 'upi_id', ''), fee)
  returning id into rid;
  insert into restaurant_staff (restaurant_id, user_id, role) values (rid, auth.uid(), 'owner');
  perform app.audit('restaurant', rid::text, 'create', null, jsonb_build_object('owner_id', auth.uid()));
  return rid;
end $$;

create or replace function update_restaurant(p_restaurant_id uuid, p_details jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r restaurants%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  select * into r from restaurants where id = p_restaurant_id for update;
  update restaurants set
    name = coalesce(nullif(btrim(p_details ->> 'name'), ''), name),
    city_id = coalesce((p_details ->> 'city_id')::uuid, city_id),
    cuisine_ids = coalesce(array(select jsonb_array_elements_text(p_details -> 'cuisine_ids'))::uuid[], cuisine_ids),
    address = coalesce(p_details ->> 'address', address),
    lat = coalesce((p_details ->> 'lat')::float8, lat),
    lng = coalesce((p_details ->> 'lng')::float8, lng),
    phone = coalesce(p_details ->> 'phone', phone),
    hours = coalesce(p_details -> 'hours', hours),
    upi_id = case when p_details ? 'upi_id' then nullif(p_details ->> 'upi_id', '') else upi_id end,
    logo_path = coalesce(p_details ->> 'logo_path', logo_path),
    cover_path = coalesce(p_details ->> 'cover_path', cover_path),
    notifications_enabled = coalesce((p_details ->> 'notifications_enabled')::boolean, notifications_enabled)
  where id = p_restaurant_id;
  perform app.audit('restaurant', p_restaurant_id::text, 'update', to_jsonb(r), p_details);
end $$;

create or replace function accept_merchant_agreement(p_restaurant_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare d legal_documents%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner']);
  select * into d from legal_documents where kind = 'merchant_agreement' and published_at is not null order by version desc limit 1;
  if not found then perform app.fail('integration_missing'); end if;
  update restaurants set merchant_agreement_version = d.version, merchant_agreement_accepted_at = now() where id = p_restaurant_id;
  insert into consent_log (user_id, document, version, action) values (auth.uid(), 'merchant_agreement', d.version, 'accepted');
end $$;

create or replace function submit_restaurant(p_restaurant_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r restaurants%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner']);
  select * into r from restaurants where id = p_restaurant_id for update;
  if r.status not in ('draft', 'rejected') then perform app.fail('invalid_input'); end if;
  if r.merchant_agreement_accepted_at is null or r.logo_path is null or r.cover_path is null
     or r.hours = '{}'::jsonb or not exists (select 1 from menu_items where restaurant_id = r.id) then
    perform app.fail('invalid_input');
  end if;
  update restaurants set status = 'pending', review_note = null where id = r.id;
  perform app.audit('restaurant', r.id::text, 'submit', jsonb_build_object('status', r.status), jsonb_build_object('status', 'pending'));
end $$;

create or replace function review_restaurant(p_restaurant_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r restaurants%rowtype; new_status text;
begin
  perform app.require_permission('restaurants.manage');
  select * into r from restaurants where id = p_restaurant_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  new_status := case p_decision
    when 'approve' then 'approved' when 'reject' then 'rejected' when 'suspend' then 'suspended' when 'reinstate' then 'approved' end;
  if new_status is null then perform app.fail('invalid_input'); end if;
  if p_decision = 'approve' and r.status <> 'pending' then perform app.fail('invalid_input'); end if;
  if p_decision = 'reinstate' and r.status <> 'suspended' then perform app.fail('invalid_input'); end if;
  if p_decision in ('suspend') and r.status <> 'approved' then perform app.fail('invalid_input'); end if;
  if p_decision = 'reject' and r.status <> 'pending' then perform app.fail('invalid_input'); end if;
  update restaurants set status = new_status, review_note = p_note,
    approved_at = case when p_decision = 'approve' then now() else approved_at end,
    approved_by = case when p_decision = 'approve' then auth.uid() else approved_by end where id = r.id;
  if p_decision = 'suspend' then
    update offers set status = 'paused' where restaurant_id = r.id and status = 'active';
    update sponsored_placements set status = 'paused', paused_at = now() where restaurant_id = r.id and status = 'active';
  end if;
  perform app.audit('restaurant', r.id::text, p_decision, jsonb_build_object('status', r.status), jsonb_build_object('status', new_status, 'note', p_note));
end $$;

create or replace function set_restaurant_fee(p_restaurant_id uuid, p_fee_percent integer) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare prev integer;
begin
  perform app.require_permission('restaurants.manage');
  if p_fee_percent < app.setting_int('fee_percent_min') or p_fee_percent > app.setting_int('fee_percent_max') then perform app.fail('value_out_of_bounds'); end if;
  select fee_percent into prev from restaurants where id = p_restaurant_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  update restaurants set fee_percent = p_fee_percent where id = p_restaurant_id;
  perform app.audit('restaurant', p_restaurant_id::text, 'set_fee', jsonb_build_object('fee_percent', prev), jsonb_build_object('fee_percent', p_fee_percent));
end $$;

-- Menus.
create or replace function save_menu_category(p_restaurant_id uuid, p_id uuid, p_name text, p_sort_order integer) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare rid uuid;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if length(btrim(p_name)) < 1 then perform app.fail('invalid_input'); end if;
  if p_id is null then
    insert into menu_categories (restaurant_id, name, sort_order) values (p_restaurant_id, btrim(p_name), p_sort_order) returning id into rid;
  else
    update menu_categories set name = btrim(p_name), sort_order = p_sort_order where id = p_id and restaurant_id = p_restaurant_id returning id into rid;
    if rid is null then perform app.fail('invalid_input'); end if;
  end if;
  return rid;
end $$;

create or replace function save_menu_item(p_restaurant_id uuid, p_id uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare iid uuid;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if not exists (select 1 from menu_categories where id = (p_data ->> 'category_id')::uuid and restaurant_id = p_restaurant_id) then perform app.fail('invalid_input'); end if;
  if (p_data ->> 'price_paise')::bigint < 0 or length(btrim(p_data ->> 'name')) < 1 then perform app.fail('invalid_input'); end if;
  if p_id is null then
    insert into menu_items (restaurant_id, category_id, dish_category_id, name, price_paise, is_veg, is_available)
    values (p_restaurant_id, (p_data ->> 'category_id')::uuid, (p_data ->> 'dish_category_id')::uuid, btrim(p_data ->> 'name'),
      (p_data ->> 'price_paise')::bigint, coalesce((p_data ->> 'is_veg')::boolean, false), coalesce((p_data ->> 'is_available')::boolean, true))
    returning id into iid;
  else
    update menu_items set category_id = (p_data ->> 'category_id')::uuid, dish_category_id = (p_data ->> 'dish_category_id')::uuid,
      name = btrim(p_data ->> 'name'), price_paise = (p_data ->> 'price_paise')::bigint,
      is_veg = coalesce((p_data ->> 'is_veg')::boolean, false), is_available = coalesce((p_data ->> 'is_available')::boolean, true)
    where id = p_id and restaurant_id = p_restaurant_id returning id into iid;
    if iid is null then perform app.fail('invalid_input'); end if;
  end if;
  return iid;
end $$;

create or replace function delete_menu_item(p_restaurant_id uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  update menu_items set is_available = false where id = p_id and restaurant_id = p_restaurant_id
    and exists (select 1 from story_dishes d where d.menu_item_id = menu_items.id);
  delete from menu_items where id = p_id and restaurant_id = p_restaurant_id
    and not exists (select 1 from story_dishes d where d.menu_item_id = menu_items.id);
end $$;

-- rows: [{category, name, price_paise, is_veg}]
create or replace function import_menu(p_restaurant_id uuid, p_rows jsonb) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare row_data jsonb; cid uuid; n integer := 0;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if jsonb_array_length(p_rows) > 2000 then perform app.fail('invalid_input'); end if;
  for row_data in select * from jsonb_array_elements(p_rows) loop
    if length(btrim(row_data ->> 'name')) < 1 or length(btrim(row_data ->> 'category')) < 1 or (row_data ->> 'price_paise')::bigint < 0 then perform app.fail('invalid_input'); end if;
    insert into menu_categories (restaurant_id, name) values (p_restaurant_id, btrim(row_data ->> 'category'))
      on conflict (restaurant_id, name) do update set name = excluded.name returning id into cid;
    insert into menu_items (restaurant_id, category_id, name, price_paise, is_veg)
    values (p_restaurant_id, cid, btrim(row_data ->> 'name'), (row_data ->> 'price_paise')::bigint, coalesce((row_data ->> 'is_veg')::boolean, false));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Reward levels, bounded by the platform maximum discount.
create or replace function save_reward_level(p_restaurant_id uuid, p_id uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare lid uuid; t text := p_data ->> 'type'; v integer := coalesce((p_data ->> 'value')::integer, 0);
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if t not in ('percent_off', 'free_item', 'free_meal') or length(btrim(p_data ->> 'label')) < 1 then perform app.fail('invalid_input'); end if;
  if t = 'percent_off' and (v < 1 or v > app.setting_int('max_discount_percent')) then perform app.fail('value_out_of_bounds'); end if;
  if (p_data ->> 'friends_required')::integer < 1 then perform app.fail('invalid_input'); end if;
  if p_id is null then
    insert into reward_levels (restaurant_id, friends_required, type, value, label)
    values (p_restaurant_id, (p_data ->> 'friends_required')::integer, t, v, btrim(p_data ->> 'label')) returning id into lid;
  else
    update reward_levels set friends_required = (p_data ->> 'friends_required')::integer, type = t, value = v, label = btrim(p_data ->> 'label')
    where id = p_id and restaurant_id = p_restaurant_id returning id into lid;
    if lid is null then perform app.fail('invalid_input'); end if;
  end if;
  return lid;
end $$;

create or replace function delete_reward_level(p_restaurant_id uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  update reward_levels set is_active = false where id = p_id and restaurant_id = p_restaurant_id;
end $$;

-- Staff.
create or replace function invite_staff(p_restaurant_id uuid, p_email text, p_role text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare iid uuid;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner']);
  if p_role not in ('manager', 'cashier') or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform app.fail('invalid_input'); end if;
  insert into restaurant_invites (restaurant_id, email, role, invited_by) values (p_restaurant_id, lower(btrim(p_email)), p_role, auth.uid()) returning id into iid;
  perform app.audit('restaurant_staff', p_restaurant_id::text, 'invite', null, jsonb_build_object('email', lower(btrim(p_email)), 'role', p_role));
  return iid;
end $$;

-- Called after sign-in: attaches any invites addressed to the caller's email.
create or replace function claim_staff_invites() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare mail text; n integer;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  select lower(email) into mail from auth.users where id = auth.uid();
  with claimed as (
    update restaurant_invites set accepted_at = now() where accepted_at is null and email = mail returning restaurant_id, role
  ), ins as (
    insert into restaurant_staff (restaurant_id, user_id, role) select restaurant_id, auth.uid(), role from claimed
    on conflict (restaurant_id, user_id) do nothing returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

create or replace function remove_staff(p_restaurant_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner']);
  if exists (select 1 from restaurant_staff where restaurant_id = p_restaurant_id and user_id = p_user_id and role = 'owner') then perform app.fail('not_permitted'); end if;
  delete from restaurant_staff where restaurant_id = p_restaurant_id and user_id = p_user_id;
  perform app.audit('restaurant_staff', p_restaurant_id::text, 'remove', jsonb_build_object('user_id', p_user_id), null);
end $$;

-- Offers.
create or replace function app.validate_offer(p jsonb, issued integer) returns void
language plpgsql stable as $$
begin
  if length(btrim(coalesce(p ->> 'title', ''))) < 3 then perform app.fail('invalid_input'); end if;
  if (p ->> 'discount_percent')::int < 1 or (p ->> 'discount_percent')::int > app.setting_int('max_discount_percent') then perform app.fail('value_out_of_bounds'); end if;
  if (p ->> 'discount_cap_paise')::bigint < 100 or (p ->> 'discount_cap_paise')::bigint > app.setting_int('max_discount_cap_paise') then perform app.fail('value_out_of_bounds'); end if;
  if (p ->> 'min_bill_paise')::bigint < app.setting_int('min_bill_floor_paise') then perform app.fail('value_out_of_bounds'); end if;
  if (p ->> 'total_codes')::int < greatest(1, issued) or (p ->> 'total_codes')::int > app.setting_int('max_codes_per_offer') then perform app.fail('value_out_of_bounds'); end if;
  if (p ->> 'group_credit_cap')::int < 1 or (p ->> 'group_credit_cap')::int > app.setting_int('group_credit_cap_max') then perform app.fail('value_out_of_bounds'); end if;
  if (p ->> 'ends_at')::timestamptz <= (p ->> 'starts_at')::timestamptz then perform app.fail('invalid_input'); end if;
  if p ->> 'drop_at' is not null and (p ->> 'drop_at')::timestamptz >= (p ->> 'ends_at')::timestamptz then perform app.fail('invalid_input'); end if;
end $$;

create or replace function save_offer(p_restaurant_id uuid, p_id uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare oid uuid; cur offers%rowtype;
begin
  perform app.require_restaurant_role(p_restaurant_id, array['owner', 'manager']);
  if p_id is not null then
    select * into cur from offers where id = p_id and restaurant_id = p_restaurant_id for update;
    if not found or cur.status = 'ended' then perform app.fail('invalid_input'); end if;
  end if;
  perform app.validate_offer(p_data, coalesce(cur.codes_issued, 0));
  if p_id is null then
    insert into offers (restaurant_id, title, discount_percent, discount_cap_paise, min_bill_paise, total_codes, starts_at, ends_at,
      drop_at, active_hours, group_credit_cap, created_by)
    values (p_restaurant_id, btrim(p_data ->> 'title'), (p_data ->> 'discount_percent')::int, (p_data ->> 'discount_cap_paise')::bigint,
      (p_data ->> 'min_bill_paise')::bigint, (p_data ->> 'total_codes')::int, (p_data ->> 'starts_at')::timestamptz, (p_data ->> 'ends_at')::timestamptz,
      (p_data ->> 'drop_at')::timestamptz, coalesce(p_data -> 'active_hours', '[]'), (p_data ->> 'group_credit_cap')::int, auth.uid())
    returning id into oid;
    perform app.audit('offer', oid::text, 'create', null, p_data);
  else
    update offers set title = btrim(p_data ->> 'title'), discount_percent = (p_data ->> 'discount_percent')::int,
      discount_cap_paise = (p_data ->> 'discount_cap_paise')::bigint, min_bill_paise = (p_data ->> 'min_bill_paise')::bigint,
      total_codes = (p_data ->> 'total_codes')::int, starts_at = (p_data ->> 'starts_at')::timestamptz, ends_at = (p_data ->> 'ends_at')::timestamptz,
      drop_at = (p_data ->> 'drop_at')::timestamptz, active_hours = coalesce(p_data -> 'active_hours', '[]'),
      group_credit_cap = (p_data ->> 'group_credit_cap')::int where id = p_id returning id into oid;
    perform app.audit('offer', oid::text, 'update', to_jsonb(cur), p_data);
  end if;
  return oid;
end $$;

create or replace function submit_offer(p_offer_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype; r restaurants%rowtype; new_status text;
begin
  select * into o from offers where id = p_offer_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  perform app.require_restaurant_role(o.restaurant_id, array['owner', 'manager']);
  select * into r from restaurants where id = o.restaurant_id;
  if r.status <> 'approved' then perform app.fail('restaurant_not_approved'); end if;
  if o.status not in ('draft', 'rejected', 'paused') then perform app.fail('invalid_input'); end if;
  new_status := case when o.status = 'paused' then 'active'
    when app.setting_bool('offers_need_approval') then 'pending_approval' else 'active' end;
  perform app.validate_offer(to_jsonb(o) || jsonb_build_object('starts_at', o.starts_at, 'ends_at', o.ends_at), o.codes_issued);
  update offers set status = new_status where id = o.id;
  perform app.audit('offer', o.id::text, 'submit', jsonb_build_object('status', o.status), jsonb_build_object('status', new_status));
  return new_status;
end $$;

create or replace function pause_offer(p_offer_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype;
begin
  select * into o from offers where id = p_offer_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  perform app.require_restaurant_role(o.restaurant_id, array['owner', 'manager']);
  if o.status <> 'active' then perform app.fail('invalid_input'); end if;
  update offers set status = 'paused' where id = o.id;
  perform app.audit('offer', o.id::text, 'pause', jsonb_build_object('status', o.status), jsonb_build_object('status', 'paused'));
end $$;

create or replace function end_offer(p_offer_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype;
begin
  select * into o from offers where id = p_offer_id for update;
  if not found then perform app.fail('invalid_input'); end if;
  if not (app.is_restaurant_member(o.restaurant_id, array['owner', 'manager']) or app.has_permission('offers.manage')) then perform app.fail('not_permitted'); end if;
  if o.status = 'ended' then return; end if;
  update offers set status = 'ended' where id = o.id;
  update codes set status = 'void' where offer_id = o.id and status = 'issued';
  update sponsored_placements set status = 'ended' where offer_id = o.id and status in ('active', 'paused', 'pending_approval');
  perform app.audit('offer', o.id::text, 'end', jsonb_build_object('status', o.status), jsonb_build_object('status', 'ended'));
end $$;

create or replace function duplicate_offer(p_offer_id uuid) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype; nid uuid;
begin
  select * into o from offers where id = p_offer_id;
  if not found then perform app.fail('invalid_input'); end if;
  perform app.require_restaurant_role(o.restaurant_id, array['owner', 'manager']);
  insert into offers (restaurant_id, title, discount_percent, discount_cap_paise, min_bill_paise, total_codes, starts_at, ends_at, drop_at,
    active_hours, group_credit_cap, created_by)
  values (o.restaurant_id, o.title || ' (copy)', o.discount_percent, o.discount_cap_paise, o.min_bill_paise, o.total_codes,
    greatest(o.starts_at, now()), greatest(o.ends_at, now() + interval '1 day'), null, o.active_hours, o.group_credit_cap, auth.uid())
  returning id into nid;
  return nid;
end $$;

create or replace function review_offer(p_offer_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype;
begin
  perform app.require_permission('offers.manage');
  select * into o from offers where id = p_offer_id for update;
  if not found or o.status <> 'pending_approval' or p_decision not in ('approve', 'reject') then perform app.fail('invalid_input'); end if;
  update offers set status = case p_decision when 'approve' then 'active' else 'rejected' end, review_note = p_note where id = o.id;
  perform app.audit('offer', o.id::text, p_decision, jsonb_build_object('status', o.status), jsonb_build_object('note', p_note));
end $$;

create or replace function admin_pause_offer(p_offer_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o offers%rowtype;
begin
  perform app.require_permission('offers.manage');
  select * into o from offers where id = p_offer_id for update;
  if not found or o.status <> 'active' then perform app.fail('invalid_input'); end if;
  update offers set status = 'paused' where id = o.id;
  perform app.audit('offer', o.id::text, 'admin_pause', jsonb_build_object('status', o.status), jsonb_build_object('status', 'paused'));
end $$;

grant execute on function pending_legal(text), accept_legal_documents(text), complete_onboarding(text, text, uuid, boolean),
  withdraw_consent(text), give_consent(text), sync_contacts(text[]), search_users(text), send_friend_request(uuid),
  respond_friend_request(uuid, boolean), remove_friend(uuid, boolean), register_device(text, text, text),
  log_client_error(text, text, jsonb), preview_redemption(uuid, uuid, bigint), create_restaurant(jsonb),
  update_restaurant(uuid, jsonb), accept_merchant_agreement(uuid), submit_restaurant(uuid), review_restaurant(uuid, text, text),
  set_restaurant_fee(uuid, integer), save_menu_category(uuid, uuid, text, integer), save_menu_item(uuid, uuid, jsonb),
  delete_menu_item(uuid, uuid), import_menu(uuid, jsonb), save_reward_level(uuid, uuid, jsonb), delete_reward_level(uuid, uuid),
  invite_staff(uuid, text, text), claim_staff_invites(), remove_staff(uuid, uuid), save_offer(uuid, uuid, jsonb),
  submit_offer(uuid), pause_offer(uuid), end_offer(uuid), duplicate_offer(uuid), review_offer(uuid, text, text),
  admin_pause_offer(uuid) to authenticated;
