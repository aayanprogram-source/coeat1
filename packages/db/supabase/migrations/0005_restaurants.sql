-- Restaurants, staff, menus and reward levels.
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  slug text not null unique,
  city_id uuid not null references cities (id),
  cuisine_ids uuid[] not null default '{}',
  address text not null,
  lat double precision not null,
  lng double precision not null,
  phone text not null,
  hours jsonb not null default '{}',
  logo_path text,
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'suspended', 'rejected')),
  fee_percent integer not null check (fee_percent between 0 and 100),
  upi_id text,
  merchant_agreement_version integer,
  merchant_agreement_accepted_at timestamptz,
  notifications_enabled boolean not null default true,
  review_note text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_city_idx on restaurants (city_id, status);
create index restaurants_owner_idx on restaurants (owner_id);
create index restaurants_status_idx on restaurants (status, created_at);
create index restaurants_name_trgm_idx on restaurants using gin (name gin_trgm_ops);
create index restaurants_cuisines_idx on restaurants using gin (cuisine_ids);
create trigger restaurants_updated_at before update on restaurants for each row execute function app.set_updated_at();

create table restaurant_staff (
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'cashier')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_staff_user_idx on restaurant_staff (user_id);

create table restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  email citext not null,
  role text not null check (role in ('manager', 'cashier')),
  invited_by uuid references auth.users (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index restaurant_invites_email_idx on restaurant_invites (email) where accepted_at is null;
create index restaurant_invites_restaurant_idx on restaurant_invites (restaurant_id);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);
create index menu_categories_restaurant_idx on menu_categories (restaurant_id, sort_order);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  category_id uuid not null references menu_categories (id) on delete cascade,
  dish_category_id uuid references dish_categories (id) on delete set null,
  name text not null,
  price_paise bigint not null check (price_paise >= 0),
  is_veg boolean not null default false,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_restaurant_idx on menu_items (restaurant_id, is_available);
create index menu_items_category_idx on menu_items (category_id);
create index menu_items_dish_category_idx on menu_items (dish_category_id);
create index menu_items_name_trgm_idx on menu_items using gin (name gin_trgm_ops);
create trigger menu_items_updated_at before update on menu_items for each row execute function app.set_updated_at();

create table reward_levels (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  friends_required integer not null check (friends_required > 0),
  type text not null check (type in ('percent_off', 'free_item', 'free_meal')),
  value integer not null default 0 check (value >= 0),
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, friends_required)
);
create index reward_levels_restaurant_idx on reward_levels (restaurant_id, friends_required);

create or replace function app.restaurant_role(rid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.role from public.restaurant_staff s where s.restaurant_id = rid and s.user_id = auth.uid();
$$;

create or replace function app.require_restaurant_role(rid uuid, roles text[]) returns text
language plpgsql stable as $$
declare r text;
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  r := app.restaurant_role(rid);
  if r is null or not (r = any (roles)) then perform app.fail('not_permitted'); end if;
  return r;
end $$;
