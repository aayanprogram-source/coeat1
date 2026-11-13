-- Helpers for Edge Functions (service role only) and a permission probe for signed-in staff.

create or replace function has_platform_permission(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select app.has_permission(p_key);
$$;
grant execute on function has_platform_permission(text) to authenticated;

-- Credentials for one provider, including secrets. Never granted to clients.
create or replace function integration_credentials(p_provider text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('provider', i.provider, 'kind', i.kind, 'public', i.public_config, 'secrets', coalesce(app.integration_secrets(i.provider), '{}'::jsonb))
  from integrations i where i.provider = p_provider and i.is_active;
$$;

-- The SMS provider used for sign-in: the active one with the most recent successful test.
create or replace function active_sms_provider() returns text
language sql stable security definer set search_path = public, extensions as $$
  select provider from integrations where kind = 'sms' and is_active and last_test_ok order by last_test_at desc limit 1;
$$;

create table push_tickets (
  ticket_id text primary key,
  token text not null,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_tickets_pending_idx on push_tickets (created_at) where checked_at is null;
alter table push_tickets enable row level security;

-- Claims queued push messages and returns them with the recipient's tokens.
create or replace function push_batch(p_limit integer) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  return coalesce((
    with claimed as (
      update notification_log set status = 'sent'
      where id in (select id from notification_log where channel = 'push' and status = 'queued' order by created_at limit p_limit for update skip locked)
      returning id, user_id, detail
    )
    select jsonb_agg(jsonb_build_object('id', c.id, 'detail', c.detail,
      'tokens', coalesce((select jsonb_agg(t.token) from push_tokens t where t.user_id = c.user_id), '[]'::jsonb)))
    from claimed c
  ), '[]'::jsonb);
end $$;

create or replace function push_mark_failed(p_log_id uuid, p_message text) returns void
language sql security definer set search_path = public, extensions as $$
  update notification_log set status = 'failed', detail = left(p_message, 300) where id = p_log_id;
$$;

create or replace function push_save_tickets(p_tickets jsonb) returns void
language sql security definer set search_path = public, extensions as $$
  insert into push_tickets (ticket_id, token)
  select t ->> 'ticket_id', t ->> 'token' from jsonb_array_elements(p_tickets) t on conflict do nothing;
$$;

-- Tickets old enough that Expo has receipts for them. They are marked checked as they are returned.
create or replace function push_pending_receipts(p_limit integer) returns jsonb
language sql security definer set search_path = public, extensions as $$
  with due as (
    update push_tickets set checked_at = now()
    where ticket_id in (select ticket_id from push_tickets where checked_at is null and created_at < now() - interval '15 minutes' order by created_at limit p_limit for update skip locked)
    returning ticket_id, token
  )
  select coalesce(jsonb_agg(jsonb_build_object('ticket_id', ticket_id, 'token', token)), '[]'::jsonb) from due;
$$;

create or replace function push_remove_token(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from push_tokens where token = p_token;
$$;

-- Profiles anonymised and not yet removed from auth.
create or replace function purgeable_accounts(p_limit integer) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from (select id from profiles where anonymised_at is not null
    and exists (select 1 from auth.users u where u.id = profiles.id) limit p_limit) p;
$$;

create or replace function app_error(p_source text, p_message text, p_detail jsonb) returns void
language sql security definer set search_path = public, extensions as $$
  insert into error_log (source, message, detail) values (left(p_source, 60), left(p_message, 500), p_detail);
$$;

revoke all on function integration_credentials(text), active_sms_provider(), push_batch(integer), push_mark_failed(uuid, text),
  push_save_tickets(jsonb), push_pending_receipts(integer), push_remove_token(text), purgeable_accounts(integer),
  app_error(text, text, jsonb) from public, anon, authenticated;
grant execute on function integration_credentials(text), active_sms_provider(), push_batch(integer), push_mark_failed(uuid, text),
  push_save_tickets(jsonb), push_pending_receipts(integer), push_remove_token(text), purgeable_accounts(integer),
  app_error(text, text, jsonb) to service_role;
