-- Rewards, badges, sponsored placements, notifications, privacy and fraud.
create table referral_credits (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  redemption_id uuid not null references redemptions (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'held' check (status in ('held', 'released', 'void')),
  release_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (redemption_id, member_id)
);
create index referral_credits_referrer_idx on referral_credits (referrer_id, restaurant_id, status);
create index referral_credits_release_idx on referral_credits (release_at) where status = 'held';
create index referral_credits_restaurant_idx on referral_credits (restaurant_id);

create table user_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  level_id uuid not null references reward_levels (id) on delete cascade,
  status text not null default 'available' check (status in ('locked', 'available', 'used', 'expired')),
  claimed_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, level_id)
);
create index user_rewards_user_idx on user_rewards (user_id, status);
create index user_rewards_restaurant_idx on user_rewards (restaurant_id, status);
create index user_rewards_level_idx on user_rewards (level_id);

create table badge_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  metric text not null check (metric in ('stories_posted', 'friends_redeemed', 'restaurants_visited', 'verified_ratings')),
  threshold integer not null check (threshold > 0),
  scope text not null check (scope in ('global', 'restaurant')),
  icon text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger badge_definitions_updated_at before update on badge_definitions for each row execute function app.set_updated_at();
create trigger badge_definitions_bump after insert or update or delete on badge_definitions for each statement execute function app.bump_config_version_trigger();

create table badge_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  badge_id uuid not null references badge_definitions (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete cascade,
  awarded_at timestamptz not null default now()
);
create unique index badge_awards_unique_idx on badge_awards (user_id, badge_id, coalesce(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index badge_awards_badge_idx on badge_awards (badge_id);

create table sponsored_placements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  offer_id uuid not null references offers (id) on delete cascade,
  placement text not null check (placement in ('feed', 'explore')),
  city_id uuid not null references cities (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_paise bigint not null check (price_paise >= 0),
  price_per_day_paise bigint not null check (price_per_day_paise >= 0),
  status text not null default 'pending_approval' check (status in ('pending_approval', 'active', 'paused', 'ended', 'rejected')),
  paused_at timestamptz,
  review_note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_dates check (ends_at > starts_at)
);
create index sponsored_restaurant_idx on sponsored_placements (restaurant_id, status);
create index sponsored_serve_idx on sponsored_placements (city_id, placement, status, starts_at, ends_at);
create index sponsored_offer_idx on sponsored_placements (offer_id);
create trigger sponsored_placements_updated_at before update on sponsored_placements for each row execute function app.set_updated_at();
alter table fee_ledger add constraint fee_ledger_boost_fk foreign key (boost_id) references sponsored_placements (id);

create table placement_events (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references sponsored_placements (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('impression', 'tap')),
  day date not null default ((now() at time zone 'Asia/Kolkata')::date),
  created_at timestamptz not null default now(),
  unique (placement_id, user_id, kind, day)
);
create index placement_events_user_idx on placement_events (user_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  campaign_id uuid,
  event text not null,
  channel text not null check (channel in ('push', 'email', 'sms', 'inbox')),
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped_limit', 'skipped_consent', 'skipped_no_template')),
  detail text,
  created_at timestamptz not null default now()
);
create index notification_log_user_idx on notification_log (user_id, created_at desc);
create index notification_log_campaign_idx on notification_log (campaign_id);
create index notification_log_created_idx on notification_log (created_at desc);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  city_id uuid references cities (id),
  active_within_days integer,
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'sending', 'sent', 'cancelled')),
  recipients integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index campaigns_status_idx on campaigns (status, scheduled_at);

create table consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null,
  version integer,
  action text not null check (action in ('accepted', 'withdrawn')),
  accepted_at timestamptz not null default now()
);
create index consent_log_user_idx on consent_log (user_id, document, accepted_at desc);

create table data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('export', 'delete')),
  status text not null default 'open' check (status in ('open', 'fulfilled', 'rejected')),
  due_at timestamptz not null,
  payload jsonb,
  fulfilled_by uuid,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);
create index data_requests_status_idx on data_requests (status, due_at);
create index data_requests_user_idx on data_requests (user_id);

create table fraud_flags (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('device_cluster', 'failed_codes', 'bill_anomaly', 'rapid_requests', 'self_referral')),
  user_id uuid references profiles (id) on delete cascade,
  restaurant_id uuid references restaurants (id) on delete cascade,
  evidence jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  dedupe_key text unique,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index fraud_flags_status_idx on fraud_flags (status, created_at desc);
create index fraud_flags_user_idx on fraud_flags (user_id);
create index fraud_flags_restaurant_idx on fraud_flags (restaurant_id);
