-- Identity: profiles, hashed contacts, friendships, devices and push tokens.
create table profiles (
  id uuid primary key,
  phone text unique,
  name text,
  handle citext unique,
  avatar_path text,
  city_id uuid,
  locale text not null default 'en',
  age_confirmed boolean not null default false,
  onboarding_done boolean not null default false,
  notifications_enabled boolean not null default true,
  marketing_consent boolean not null default false,
  suspended_at timestamptz,
  deleted_at timestamptz,
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,24}$')
);
create index profiles_city_idx on profiles (city_id);
create index profiles_handle_trgm_idx on profiles using gin (handle gin_trgm_ops);
create index profiles_deleted_idx on profiles (deleted_at) where deleted_at is not null;
create trigger profiles_updated_at before update on profiles for each row execute function app.set_updated_at();

create or replace function app.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, case when new.phone is null or new.phone like '+%' then new.phone else '+' || new.phone end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_auth_user();

create table contact_hashes (
  user_id uuid not null references profiles (id) on delete cascade,
  phone_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, phone_hash)
);
create index contact_hashes_hash_idx on contact_hashes (phone_hash);

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_distinct check (requester_id <> addressee_id),
  constraint friendships_unique unique (requester_id, addressee_id)
);
create index friendships_addressee_idx on friendships (addressee_id, status);
create index friendships_requester_idx on friendships (requester_id, status);
create trigger friendships_updated_at before update on friendships for each row execute function app.set_updated_at();

create or replace function app.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on push_tokens (user_id);

create table device_ids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  device_id text not null,
  platform text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);
create index device_ids_device_idx on device_ids (device_id);
