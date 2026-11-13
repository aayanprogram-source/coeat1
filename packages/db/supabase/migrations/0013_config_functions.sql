-- Configuration engine: settings, checklist, app_config, legal documents, master data and integrations.

create or replace function update_setting(p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  s platform_settings%rowtype;
  n numeric;
  fmin bigint;
  fmax bigint;
  fdef bigint;
  max_len integer;
begin
  perform app.require_permission('settings.manage');
  select * into s from platform_settings where key = p_key for update;
  if not found then perform app.fail('setting_unknown'); end if;

  if s.type in ('integer', 'number') then
    if jsonb_typeof(p_value) <> 'number' then perform app.fail('setting_invalid'); end if;
    n := (p_value #>> '{}')::numeric;
    if s.type = 'integer' and n <> trunc(n) then perform app.fail('setting_invalid'); end if;
    if (s.min is not null and n < s.min) or (s.max is not null and n > s.max) then perform app.fail('value_out_of_bounds'); end if;
  elsif s.type = 'boolean' then
    if jsonb_typeof(p_value) <> 'boolean' then perform app.fail('setting_invalid'); end if;
  elsif s.type in ('string', 'text') then
    max_len := 500;
    if s.type = 'text' then max_len := 20000; end if;
    if jsonb_typeof(p_value) <> 'string' or length(p_value #>> '{}') > max_len then
      perform app.fail('setting_invalid');
    end if;
  elsif s.type = 'json' then
    if jsonb_typeof(p_value) <> 'object' then perform app.fail('setting_invalid'); end if;
  end if;

  -- The fee bounds must stay ordered and the default must sit inside them.
  if p_key in ('fee_percent_min', 'fee_percent_max', 'fee_percent_default') then
    fmin := case p_key when 'fee_percent_min' then n::bigint else app.setting_int('fee_percent_min') end;
    fmax := case p_key when 'fee_percent_max' then n::bigint else app.setting_int('fee_percent_max') end;
    fdef := case p_key when 'fee_percent_default' then n::bigint else app.setting_int('fee_percent_default') end;
    if fmin > fmax or fdef < fmin or fdef > fmax then perform app.fail('value_out_of_bounds'); end if;
  end if;
  if p_key = 'group_credit_cap_default' and n > app.setting_int('group_credit_cap_max') then perform app.fail('value_out_of_bounds'); end if;
  if p_key = 'group_credit_cap_max' and n < app.setting_int('group_credit_cap_default') then perform app.fail('value_out_of_bounds'); end if;

  update platform_settings set value = p_value, updated_by = auth.uid(), updated_at = now() where key = p_key;
  perform app.audit('setting', p_key, 'update', jsonb_build_object('value', s.value), jsonb_build_object('value', p_value));
  return p_value;
end $$;

-- Go-live checklist, computed from the database.
create or replace function app.checklist() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  items jsonb := '[]'::jsonb;
  missing_legal text[];
  missing_company text[];
  ok boolean;
begin
  select array_agg(k) into missing_legal from unnest(array['terms', 'privacy', 'merchant_agreement', 'rewards_policy', 'community_guidelines']) k
    where not exists (select 1 from legal_documents d where d.kind = k and d.published_at is not null);
  items := items || jsonb_build_object('key', 'legal', 'label', 'Legal documents published', 'ok', missing_legal is null,
    'detail', case when missing_legal is null then null else 'Missing: ' || array_to_string(missing_legal, ', ') end,
    'hides', 'Sign-up and restaurant onboarding');

  select array_agg(label order by label) into missing_company from platform_settings
    where launch_required and (
      (type in ('string', 'text') and btrim(value #>> '{}') = '')
      or (type = 'json' and exists (select 1 from jsonb_each_text(value) e where btrim(e.value) = ''))
    );
  items := items || jsonb_build_object('key', 'company', 'label', 'Company and invoicing details', 'ok', missing_company is null,
    'detail', case when missing_company is null then null else 'Missing: ' || array_to_string(missing_company, ', ') end,
    'hides', 'Invoices and grievance officer details');

  ok := exists (select 1 from integrations where kind = 'sms' and is_active and last_test_ok);
  items := items || jsonb_build_object('key', 'sms', 'label', 'SMS provider with a successful test send', 'ok', ok,
    'detail', case when ok then null else 'Configure MSG91 or Twilio and send a test' end, 'hides', 'Customer sign-in');

  ok := exists (select 1 from integrations where kind = 'push' and is_active and status in ('configured', 'tested'));
  items := items || jsonb_build_object('key', 'push', 'label', 'Push notifications configured', 'ok', ok,
    'detail', case when ok then null else 'Add the Expo access token' end, 'hides', 'Push alerts');

  ok := exists (select 1 from integrations where kind = 'maps' and is_active and status in ('configured', 'tested'));
  items := items || jsonb_build_object('key', 'maps', 'label', 'Maps configured', 'ok', ok,
    'detail', case when ok then null else 'Add the Google Maps keys' end, 'hides', 'Location search and map screens');

  ok := exists (select 1 from integrations where kind = 'email' and is_active and status in ('configured', 'tested'));
  items := items || jsonb_build_object('key', 'email', 'label', 'Email configured', 'ok', ok,
    'detail', case when ok then null else 'Add SMTP credentials' end, 'hides', 'Staff invites and invoice emails');

  ok := exists (select 1 from cities where is_active) and exists (select 1 from cuisines where is_active);
  items := items || jsonb_build_object('key', 'master_data', 'label', 'At least one city and one cuisine', 'ok', ok,
    'detail', case when ok then null else 'Add a city and a cuisine in Master data' end, 'hides', 'Restaurant onboarding');

  ok := exists (select 1 from admin_users where mfa_enrolled);
  items := items || jsonb_build_object('key', 'team', 'label', 'Platform staff member with two-factor enabled', 'ok', ok,
    'detail', case when ok then null else 'Enrol two-factor for a platform account' end, 'hides', 'Platform administration');

  return items;
end $$;

create or replace function go_live_checklist() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform app.require_permission('checklist.view');
  return app.checklist();
end $$;

create or replace function app_config() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  checklist jsonb := app.checklist();
  launch boolean := not exists (select 1 from jsonb_array_elements(checklist) i where (i ->> 'ok')::boolean = false);
  sms boolean := exists (select 1 from integrations where kind = 'sms' and is_active and last_test_ok);
  maps_row integrations%rowtype;
begin
  select * into maps_row from integrations where kind = 'maps' and is_active and status in ('configured', 'tested');
  return jsonb_build_object(
    'version', (select version::text from config_version),
    'settings', coalesce((select jsonb_object_agg(key, value) from platform_settings
      where key not in ('bank_details', 'invoice_next_number', 'invoice_prefix')), '{}'::jsonb),
    'flags', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'is_enabled', is_enabled,
      'city_ids', to_jsonb(city_ids), 'rollout_percent', rollout_percent)) from feature_flags), '[]'::jsonb),
    'translations', coalesce((select jsonb_object_agg(locale, kv) from (
      select locale, jsonb_object_agg(key, value) kv from translations group by locale) t), '{}'::jsonb),
    'legal', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'version', version, 'title', title,
      'published_at', published_at)) from (
      select distinct on (kind) kind, version, title, published_at from legal_documents
      where published_at is not null order by kind, version desc) l), '[]'::jsonb),
    'onboarding_slides', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'body', body, 'icon', icon)
      order by sort_order) from onboarding_slides where is_published), '[]'::jsonb),
    'faqs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'question', question, 'answer', answer, 'audience', audience)
      order by sort_order) from faqs where is_published), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'state', state, 'lat', lat, 'lng', lng)
      order by name) from cities where is_active), '[]'::jsonb),
    'cuisines', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name)
      from cuisines where is_active), '[]'::jsonb),
    'dish_categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by name)
      from dish_categories where is_active), '[]'::jsonb),
    'report_reasons', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'label', label) order by sort_order)
      from report_reasons where is_active), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'metric', metric,
      'threshold', threshold, 'scope', scope, 'icon', icon) order by threshold) from badge_definitions where is_active), '[]'::jsonb),
    'integrations', jsonb_build_object(
      'sms', sms,
      'email', exists (select 1 from integrations where kind = 'email' and is_active and status in ('configured', 'tested')),
      'push', exists (select 1 from integrations where kind = 'push' and is_active and status in ('configured', 'tested')),
      'maps', maps_row.provider is not null,
      'payments', exists (select 1 from integrations where kind = 'payments' and is_active and status in ('configured', 'tested'))),
    'maps_public_keys', jsonb_build_object('mobile', maps_row.public_config ->> 'mobile_key', 'web', maps_row.public_config ->> 'web_key'),
    'launch_ready', launch
  );
end $$;
grant execute on function app_config() to anon, authenticated;

-- Legal documents: save a draft, then publish it as the next version.
create or replace function save_legal_draft(p_kind text, p_title text, p_body text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v integer; rid uuid;
begin
  perform app.require_permission('content.manage');
  if p_kind not in ('terms', 'privacy', 'merchant_agreement', 'rewards_policy', 'community_guidelines') then perform app.fail('invalid_input'); end if;
  if length(btrim(p_title)) < 2 or length(p_body) < 10 then perform app.fail('invalid_input'); end if;
  select id into rid from legal_documents where kind = p_kind and published_at is null;
  if rid is null then
    select coalesce(max(version), 0) + 1 into v from legal_documents where kind = p_kind;
    insert into legal_documents (kind, version, title, body, created_by) values (p_kind, v, p_title, p_body, auth.uid()) returning id into rid;
    perform app.audit('legal_document', rid::text, 'create_draft', null, jsonb_build_object('kind', p_kind, 'version', v));
  else
    update legal_documents set title = p_title, body = p_body where id = rid;
    perform app.audit('legal_document', rid::text, 'update_draft', null, jsonb_build_object('kind', p_kind));
  end if;
  return rid;
end $$;

create or replace function publish_legal_document(p_kind text) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare d legal_documents%rowtype;
begin
  perform app.require_permission('content.manage');
  select * into d from legal_documents where kind = p_kind and published_at is null for update;
  if not found then perform app.fail('invalid_input'); end if;
  update legal_documents set published_at = now(), published_by = auth.uid() where id = d.id;
  perform app.audit('legal_document', d.id::text, 'publish', null, jsonb_build_object('kind', p_kind, 'version', d.version));
  return d.version;
end $$;

-- Master data and content: one audited, whitelisted writer instead of a dozen near-identical functions.
create or replace function app.entity_def(e text) returns table (tbl text, pk text, perm text, cols text[])
language sql immutable as $$
  select v.tbl, v.pk, v.perm, v.cols from (values
    ('onboarding_slide', 'onboarding_slides', 'id', 'content.manage', array['title', 'body', 'icon', 'sort_order', 'is_published']),
    ('faq', 'faqs', 'id', 'content.manage', array['question', 'answer', 'audience', 'sort_order', 'is_published']),
    ('notification_template', 'notification_templates', 'id', 'content.manage', array['event', 'locale', 'title', 'body', 'is_enabled']),
    ('city', 'cities', 'id', 'master_data.manage', array['name', 'state', 'lat', 'lng', 'is_active', 'sponsored_enabled', 'sponsored_price_per_day_paise']),
    ('cuisine', 'cuisines', 'id', 'master_data.manage', array['name', 'is_active']),
    ('dish_category', 'dish_categories', 'id', 'master_data.manage', array['name', 'is_active']),
    ('report_reason', 'report_reasons', 'id', 'master_data.manage', array['label', 'is_active', 'sort_order']),
    ('badge_definition', 'badge_definitions', 'id', 'master_data.manage', array['name', 'metric', 'threshold', 'scope', 'icon', 'is_active']),
    ('feature_flag', 'feature_flags', 'key', 'master_data.manage', array['key', 'description', 'is_enabled', 'city_ids', 'rollout_percent']),
    ('breach', 'breach_log', 'id', 'data_requests.manage', array['summary', 'detected_at', 'affected_count', 'notified_authority_at', 'notes'])
  ) as v(entity, tbl, pk, perm, cols) where v.entity = e;
$$;

create or replace function admin_save(p_entity text, p_id text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  def record;
  keys text[];
  col_list text;
  set_list text;
  before_row jsonb;
  after_row jsonb;
begin
  select * into def from app.entity_def(p_entity);
  if def.tbl is null then perform app.fail('invalid_input'); end if;
  perform app.require_permission(def.perm);

  select array_agg(k) into keys from jsonb_object_keys(p_data) k where k = any (def.cols);
  if keys is null then perform app.fail('invalid_input'); end if;
  select string_agg(quote_ident(k), ', ') into col_list from unnest(keys) k;

  if p_id is null then
    execute format('insert into %I (%s) select %s from jsonb_populate_record(null::%I, $1) returning to_jsonb(%I.*)',
      def.tbl, col_list, col_list, def.tbl, def.tbl) into after_row using p_data;
    perform app.audit(p_entity, after_row ->> def.pk, 'create', null, after_row);
  else
    execute format('select to_jsonb(t.*) from %I t where t.%I::text = $1 for update', def.tbl, def.pk) into before_row using p_id;
    if before_row is null then perform app.fail('invalid_input'); end if;
    select string_agg(quote_ident(k), ', ') into set_list from unnest(keys) k;
    execute format('update %I set (%s) = (select %s from jsonb_populate_record(null::%I, $2)) where %I::text = $1 returning to_jsonb(%I.*)',
      def.tbl, set_list, col_list, def.tbl, def.pk, def.tbl) into after_row using p_id, p_data;
    perform app.audit(p_entity, p_id, 'update', before_row, after_row);
  end if;
  return after_row;
end $$;

create or replace function admin_delete(p_entity text, p_id text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare def record; before_row jsonb;
begin
  select * into def from app.entity_def(p_entity);
  if def.tbl is null then perform app.fail('invalid_input'); end if;
  perform app.require_permission(def.perm);
  execute format('delete from %I where %I::text = $1 returning to_jsonb(%I.*)', def.tbl, def.pk, def.tbl) into before_row using p_id;
  if before_row is null then perform app.fail('invalid_input'); end if;
  perform app.audit(p_entity, p_id, 'delete', before_row, null);
end $$;

create or replace function save_translation(p_key text, p_locale text, p_value text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare prev text;
begin
  perform app.require_permission('content.manage');
  if p_locale !~ '^[a-z]{2}(-[A-Z]{2})?$' or length(p_key) not between 1 and 120 or length(p_value) > 2000 then perform app.fail('invalid_input'); end if;
  select value into prev from translations where key = p_key and locale = p_locale;
  insert into translations (key, locale, value, updated_by) values (p_key, p_locale, p_value, auth.uid())
    on conflict (key, locale) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
  perform app.audit('translation', p_locale || ':' || p_key, case when prev is null then 'create' else 'update' end,
    case when prev is null then null else jsonb_build_object('value', prev) end, jsonb_build_object('value', p_value));
end $$;

create or replace function delete_translation(p_key text, p_locale text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare prev text;
begin
  perform app.require_permission('content.manage');
  delete from translations where key = p_key and locale = p_locale returning value into prev;
  if prev is not null then
    perform app.audit('translation', p_locale || ':' || p_key, 'delete', jsonb_build_object('value', prev), null);
  end if;
end $$;

-- Integrations: public fields are stored in the table, secret fields in Vault as one JSON document.
create or replace function set_integration(p_provider text, p_kind text, p_public jsonb, p_secrets jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  existing integrations%rowtype;
  sid uuid;
  hints jsonb := '{}'::jsonb;
  k text;
  v text;
begin
  perform app.require_permission('integrations.manage');
  select * into existing from integrations where provider = p_provider;

  for k, v in select * from jsonb_each_text(p_secrets) loop
    hints := hints || jsonb_build_object(k, right(v, 4));
  end loop;

  if jsonb_typeof(p_secrets) = 'object' and p_secrets <> '{}'::jsonb then
    if existing.vault_secret_id is null then
      sid := vault.create_secret(p_secrets::text, 'integration_' || p_provider, 'Credentials for ' || p_provider);
    else
      perform vault.update_secret(existing.vault_secret_id, p_secrets::text);
      sid := existing.vault_secret_id;
    end if;
  else
    sid := existing.vault_secret_id;
    hints := existing.secret_hints;
  end if;

  insert into integrations (provider, kind, status, public_config, secret_hints, vault_secret_id, updated_by)
  values (p_provider, p_kind, 'configured', p_public, hints, sid, auth.uid())
  on conflict (provider) do update set status = 'configured', public_config = excluded.public_config,
    secret_hints = excluded.secret_hints, vault_secret_id = excluded.vault_secret_id,
    last_test_ok = null, last_test_at = null, last_test_message = null,
    updated_by = excluded.updated_by, updated_at = now();

  -- Secrets are never audited; only which provider changed.
  perform app.audit('integration', p_provider, 'configure', null, jsonb_build_object('fields', hints));
end $$;

-- Only Edge Functions running as service_role may read secrets or record test results.
create or replace function app.integration_secrets(p_provider text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select s.decrypted_secret::jsonb
  from integrations i join vault.decrypted_secrets s on s.id = i.vault_secret_id
  where i.provider = p_provider;
$$;
revoke all on function app.integration_secrets(text) from public, anon, authenticated;
grant execute on function app.integration_secrets(text) to service_role;

create or replace function record_integration_test(p_provider text, p_ok boolean, p_message text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update integrations set last_test_at = now(), last_test_ok = p_ok, last_test_message = left(p_message, 300),
    status = case when p_ok then 'tested' else 'failed' end where provider = p_provider;
  perform app.audit('integration', p_provider, 'test', null, jsonb_build_object('ok', p_ok));
end $$;
revoke all on function record_integration_test(text, boolean, text) from public, anon, authenticated;
grant execute on function record_integration_test(text, boolean, text) to service_role;

-- Internal helpers are callable only by other definer functions, never directly by clients.
revoke all on function app.audit(text, text, text, jsonb, jsonb), app.log_error(text, text, jsonb),
  app.bump_config_version(), app.checklist() from public, anon, authenticated;

grant execute on function update_setting(text, jsonb), go_live_checklist(), save_legal_draft(text, text, text),
  publish_legal_document(text), admin_save(text, text, jsonb), admin_delete(text, text),
  save_translation(text, text, text), delete_translation(text, text), set_integration(text, text, jsonb, jsonb)
  to authenticated;
