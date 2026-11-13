-- Platform configuration: legal documents, content, master data, flags and integrations.
create table legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('terms', 'privacy', 'merchant_agreement', 'rewards_policy', 'community_guidelines')),
  version integer not null,
  title text not null,
  body text not null,
  published_at timestamptz,
  published_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (kind, version)
);
create index legal_documents_published_idx on legal_documents (kind, published_at desc) where published_at is not null;

create table onboarding_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  icon text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger onboarding_slides_updated_at before update on onboarding_slides for each row execute function app.set_updated_at();

create table faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  audience text not null check (audience in ('customer', 'restaurant')),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faqs_updated_at before update on faqs for each row execute function app.set_updated_at();

create table translations (
  key text not null,
  locale text not null,
  value text not null,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (key, locale)
);
create index translations_locale_idx on translations (locale);

create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  locale text not null,
  title text not null,
  body text not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event, locale)
);
create trigger notification_templates_updated_at before update on notification_templates for each row execute function app.set_updated_at();

create table cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null,
  lat double precision not null,
  lng double precision not null,
  is_active boolean not null default true,
  sponsored_enabled boolean not null default true,
  sponsored_price_per_day_paise bigint check (sponsored_price_per_day_paise is null or sponsored_price_per_day_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, state)
);
create trigger cities_updated_at before update on cities for each row execute function app.set_updated_at();
alter table profiles add constraint profiles_city_fk foreign key (city_id) references cities (id) on delete set null;

create table cuisines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table dish_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table report_reasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]{1,60}$'),
  description text not null default '',
  is_enabled boolean not null default false,
  city_ids uuid[] not null default '{}',
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table integrations (
  provider text primary key check (provider in ('sms_msg91', 'sms_twilio', 'email_smtp', 'push_expo', 'maps_google', 'payments_razorpay')),
  kind text not null check (kind in ('sms', 'email', 'push', 'maps', 'payments')),
  status text not null default 'configured' check (status in ('configured', 'tested', 'failed', 'disabled')),
  public_config jsonb not null default '{}',
  secret_hints jsonb not null default '{}',
  vault_secret_id uuid,
  is_active boolean not null default true,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table breach_log (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  detected_at timestamptz not null,
  affected_count integer not null default 0,
  notified_authority_at timestamptz,
  notes text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger breach_log_updated_at before update on breach_log for each row execute function app.set_updated_at();

-- Any change to published configuration bumps the config version.
create trigger platform_settings_bump after insert or update or delete on platform_settings for each statement execute function app.bump_config_version_trigger();
create trigger legal_documents_bump after insert or update or delete on legal_documents for each statement execute function app.bump_config_version_trigger();
create trigger onboarding_slides_bump after insert or update or delete on onboarding_slides for each statement execute function app.bump_config_version_trigger();
create trigger faqs_bump after insert or update or delete on faqs for each statement execute function app.bump_config_version_trigger();
create trigger translations_bump after insert or update or delete on translations for each statement execute function app.bump_config_version_trigger();
create trigger cities_bump after insert or update or delete on cities for each statement execute function app.bump_config_version_trigger();
create trigger cuisines_bump after insert or update or delete on cuisines for each statement execute function app.bump_config_version_trigger();
create trigger dish_categories_bump after insert or update or delete on dish_categories for each statement execute function app.bump_config_version_trigger();
create trigger report_reasons_bump after insert or update or delete on report_reasons for each statement execute function app.bump_config_version_trigger();
create trigger feature_flags_bump after insert or update or delete on feature_flags for each statement execute function app.bump_config_version_trigger();
create trigger integrations_bump after insert or update or delete on integrations for each statement execute function app.bump_config_version_trigger();
