-- Visits, redemptions, fee ledger and invoices. Money is stored as integer paise.
create table visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  host_id uuid not null references profiles (id) on delete cascade,
  table_label text not null default '',
  join_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'open' check (status in ('open', 'billed', 'verified', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visits_restaurant_idx on visits (restaurant_id, status);
create index visits_host_idx on visits (host_id, created_at desc);
create trigger visits_updated_at before update on visits for each row execute function app.set_updated_at();
alter table stories add constraint stories_visit_fk foreign key (visit_id) references visits (id) on delete set null;

create table visit_members (
  visit_id uuid not null references visits (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_via text not null check (joined_via in ('host', 'qr', 'phone')),
  created_at timestamptz not null default now(),
  primary key (visit_id, user_id)
);
create index visit_members_user_idx on visit_members (user_id);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references codes (id),
  restaurant_id uuid not null references restaurants (id),
  offer_id uuid not null references offers (id),
  visit_id uuid references visits (id),
  customer_id uuid not null references profiles (id),
  cashier_id uuid not null references auth.users (id),
  idempotency_key text not null,
  bill_paise bigint not null check (bill_paise > 0),
  discount_paise bigint not null check (discount_paise >= 0),
  fee_paise bigint not null check (fee_paise >= 0),
  fee_percent integer not null,
  bill_photo_path text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'reversed')),
  reversal_reason text,
  reversed_by uuid,
  reversed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, idempotency_key)
);
create unique index redemptions_code_live_idx on redemptions (code_id) where status in ('pending', 'verified');
create index redemptions_restaurant_idx on redemptions (restaurant_id, created_at desc);
create index redemptions_customer_idx on redemptions (customer_id, restaurant_id) where status = 'verified';
create index redemptions_offer_idx on redemptions (offer_id);
create index redemptions_visit_idx on redemptions (visit_id);
create index redemptions_cashier_idx on redemptions (cashier_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id),
  number text not null unique,
  period date not null,
  subtotal_paise bigint not null check (subtotal_paise >= 0),
  gst_paise bigint not null check (gst_paise >= 0),
  total_paise bigint not null check (total_paise >= 0),
  gst_percent integer not null,
  status text not null default 'issued' check (status in ('issued', 'paid', 'overdue')),
  due_at timestamptz not null,
  payment_link text,
  payment_link_id text,
  bank_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, period)
);
create index invoices_status_idx on invoices (status, due_at);
create index invoices_restaurant_idx on invoices (restaurant_id, period desc);

create table fee_ledger (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants (id),
  redemption_id uuid references redemptions (id),
  boost_id uuid,
  kind text not null check (kind in ('referral_fee', 'boost_fee')),
  fee_paise bigint not null check (fee_paise >= 0),
  gst_paise bigint not null check (gst_paise >= 0),
  period date not null,
  status text not null default 'accrued' check (status in ('accrued', 'invoiced', 'void')),
  invoice_id uuid references invoices (id),
  description text not null default '',
  charge_date date,
  created_at timestamptz not null default now(),
  constraint fee_ledger_source check ((kind = 'referral_fee' and redemption_id is not null) or (kind = 'boost_fee' and boost_id is not null))
);
create unique index fee_ledger_redemption_idx on fee_ledger (redemption_id) where kind = 'referral_fee' and status <> 'void';
create unique index fee_ledger_boost_day_idx on fee_ledger (boost_id, charge_date) where kind = 'boost_fee' and status <> 'void';
create index fee_ledger_restaurant_idx on fee_ledger (restaurant_id, period, status);
create index fee_ledger_invoice_idx on fee_ledger (invoice_id);
create index fee_ledger_boost_idx on fee_ledger (boost_id);

create table payment_events (
  id text primary key,
  invoice_id uuid references invoices (id),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
