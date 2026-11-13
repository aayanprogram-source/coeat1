-- Lockout after repeated failed dashboard sign-ins. Keyed by a hash so email addresses are not stored here.
create table login_attempts (
  key text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table login_attempts enable row level security;

create or replace function app.login_key(p_email text) returns text
language sql immutable security definer set search_path = public, extensions as $$
  select encode(digest(lower(btrim(p_email)), 'sha256'), 'hex');
$$;
revoke all on function app.login_key(text) from public, anon, authenticated;

-- Returns the seconds remaining on a lockout, or 0 when sign-in may proceed.
create or replace function login_lock_seconds(p_email text) returns integer
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select greatest(0, ceil(extract(epoch from (locked_until - now())))::int)
    from login_attempts where key = app.login_key(p_email)), 0);
$$;

create or replace function login_record(p_email text, p_success boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text := app.login_key(p_email); f integer;
begin
  if p_success then
    delete from login_attempts where key = k;
    return;
  end if;
  insert into login_attempts (key, failures) values (k, 1)
    on conflict (key) do update set failures = login_attempts.failures + 1, updated_at = now()
    returning failures into f;
  if f >= app.setting_int('login_max_failures') then
    update login_attempts set locked_until = now() + make_interval(mins => app.setting_int('login_lockout_minutes')::int), failures = 0 where key = k;
  end if;
end $$;

grant execute on function login_lock_seconds(text), login_record(text, boolean) to anon, authenticated;
