-- Offers, waitlists, codes and code request log (rate limiting).
create table offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  title text not null,
  discount_percent integer not null check (discount_percent between 1 and 100),
  discount_cap_paise bigint not null check (discount_cap_paise > 0),
  min_bill_paise bigint not null check (min_bill_paise >= 0),
  total_codes integer not null check (total_codes > 0),
  codes_issued integer not null default 0 check (codes_issued >= 0 and codes_issued <= total_codes),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  drop_at timestamptz,
  active_hours jsonb not null default '[]',
  group_credit_cap integer not null check (group_credit_cap > 0),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'active', 'paused', 'ended', 'rejected')),
  review_note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_dates check (ends_at > starts_at)
);
create index offers_restaurant_idx on offers (restaurant_id, status);
create index offers_active_idx on offers (status, ends_at) where status = 'active';
create index offers_drop_idx on offers (drop_at) where status = 'active' and drop_at is not null;
create trigger offers_updated_at before update on offers for each row execute function app.set_updated_at();

create table offer_waitlist (
  offer_id uuid not null references offers (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);
create index offer_waitlist_user_idx on offer_waitlist (user_id);

create table codes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  story_id uuid,
  referrer_id uuid references profiles (id) on delete set null,
  holder_id uuid not null references profiles (id) on delete cascade,
  short_code text not null check (short_code ~ '^[0-9]{4}$'),
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'expired', 'void')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  ending_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index codes_active_short_idx on codes (restaurant_id, short_code) where status = 'issued';
create unique index codes_active_holder_idx on codes (restaurant_id, holder_id) where status = 'issued';
create index codes_holder_idx on codes (holder_id, status);
create index codes_offer_idx on codes (offer_id, status);
create index codes_story_idx on codes (story_id);
create index codes_referrer_idx on codes (referrer_id);
create index codes_expiry_idx on codes (expires_at) where status = 'issued';

create table code_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete cascade,
  outcome text not null,
  created_at timestamptz not null default now()
);
create index code_requests_user_idx on code_requests (user_id, created_at desc);

-- Failed redemption attempts feed the fraud detector.
create table redemption_attempts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  cashier_id uuid references auth.users (id) on delete set null,
  short_code text,
  outcome text not null,
  created_at timestamptz not null default now()
);
create index redemption_attempts_restaurant_idx on redemption_attempts (restaurant_id, created_at desc);
