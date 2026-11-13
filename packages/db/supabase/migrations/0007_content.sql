-- User content: check-ins, stories, dish ratings, reports and polls.
create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  distance_m double precision not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index checkins_user_idx on checkins (user_id, created_at desc);
create index checkins_restaurant_idx on checkins (restaurant_id, created_at desc);

create table stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  offer_id uuid references offers (id) on delete set null,
  visit_id uuid,
  checkin_id uuid not null references checkins (id),
  photo_path text not null,
  caption text not null default '',
  has_reward boolean not null default false,
  verified boolean not null default false,
  expires_at timestamptz not null,
  deleted_at timestamptz,
  removed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stories_author_idx on stories (author_id, created_at desc);
create index stories_restaurant_idx on stories (restaurant_id, created_at desc);
create index stories_live_idx on stories (expires_at) where deleted_at is null;
create index stories_offer_idx on stories (offer_id);
create trigger stories_updated_at before update on stories for each row execute function app.set_updated_at();
alter table codes add constraint codes_story_fk foreign key (story_id) references stories (id) on delete set null;

create table story_dishes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories (id) on delete cascade,
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, menu_item_id)
);
create index story_dishes_item_idx on story_dishes (menu_item_id);
create trigger story_dishes_updated_at before update on story_dishes for each row execute function app.set_updated_at();

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  story_id uuid not null references stories (id) on delete cascade,
  reason_id uuid not null references report_reasons (id),
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on reports (status, created_at);
create index reports_story_idx on reports (story_id);
create index reports_reason_idx on reports (reason_id);

create table polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  question text not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index polls_author_idx on polls (author_id, created_at desc);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  restaurant_id uuid not null references restaurants (id) on delete cascade,
  sort_order integer not null default 0,
  unique (poll_id, restaurant_id)
);
create index poll_options_restaurant_idx on poll_options (restaurant_id);

create table poll_votes (
  poll_id uuid not null references polls (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index poll_votes_option_idx on poll_votes (option_id);
