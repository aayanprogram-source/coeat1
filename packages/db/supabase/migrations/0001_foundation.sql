-- Foundation: extensions, internal schema, shared helpers, audit and error logs.
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- Raise a machine-readable error. Clients map the message to a translation key.
create or replace function app.fail(code text) returns void
language plpgsql as $$
begin
  raise exception using message = code, errcode = 'P0001';
end $$;

create or replace function app.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function app.distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000.0 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity text not null,
  entity_id text,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc);
create index audit_log_created_idx on audit_log (created_at desc);

create table error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  detail jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index error_log_created_idx on error_log (created_at desc);
create index error_log_source_idx on error_log (source, created_at desc);

create or replace function app.audit(entity text, entity_id text, action text, before jsonb, after jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (auth.uid(), entity, entity_id, action, before, after);
$$;

create or replace function app.log_error(source text, message text, detail jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.error_log (source, message, detail, user_id) values (source, message, detail, auth.uid());
$$;

create table platform_settings (
  key text primary key,
  value jsonb not null,
  type text not null check (type in ('integer', 'number', 'boolean', 'string', 'text', 'json')),
  "group" text not null,
  label text not null,
  description text not null default '',
  min numeric,
  max numeric,
  unit text,
  launch_required boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function app.setting(key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.platform_settings where platform_settings.key = setting.key;
$$;

create or replace function app.setting_int(key text) returns bigint
language plpgsql stable as $$
declare v jsonb := app.setting(key);
begin
  if v is null or jsonb_typeof(v) <> 'number' then raise exception 'setting_missing: %', key; end if;
  return (v #>> '{}')::bigint;
end $$;

create or replace function app.setting_bool(key text) returns boolean
language plpgsql stable as $$
declare v jsonb := app.setting(key);
begin
  if v is null or jsonb_typeof(v) <> 'boolean' then raise exception 'setting_missing: %', key; end if;
  return (v #>> '{}')::boolean;
end $$;

create or replace function app.setting_text(key text) returns text
language plpgsql stable as $$
declare v jsonb := app.setting(key);
begin
  if v is null or jsonb_typeof(v) <> 'string' then raise exception 'setting_missing: %', key; end if;
  return v #>> '{}';
end $$;

-- A monotonically increasing config version so clients can detect changes cheaply.
create table config_version (
  id boolean primary key default true check (id),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into config_version default values;

create or replace function app.bump_config_version() returns void
language sql security definer set search_path = '' as $$
  update public.config_version set version = version + 1, updated_at = now();
$$;

create or replace function app.bump_config_version_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform app.bump_config_version();
  return null;
end $$;
