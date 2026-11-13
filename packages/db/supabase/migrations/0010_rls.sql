-- Row Level Security on every table. Writes to money, codes and credits happen only through functions.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public;

create or replace function app.is_restaurant_member(rid uuid, roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = rid and s.user_id = auth.uid() and s.role = any (roles)
  );
$$;

create or replace function app.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.deleted_at is null and p.suspended_at is null
  );
$$;

-- Profiles: own row, friends, and platform staff with users.view.
grant select on profiles to authenticated;
grant update (name, handle, avatar_path, city_id, locale, notifications_enabled) on profiles to authenticated;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or app.are_friends(auth.uid(), id) or app.has_permission('users.view'));
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid() and deleted_at is null) with check (id = auth.uid());

grant select on friendships to authenticated;
create policy friendships_select on friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

grant select, insert, delete on push_tokens to authenticated;
create policy push_tokens_own on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Platform staff tables.
grant select on admin_users, admin_roles, role_permissions, admin_invites to authenticated;
create policy admin_users_select on admin_users for select to authenticated
  using (user_id = auth.uid() or app.has_permission('team.view'));
create policy admin_roles_select on admin_roles for select to authenticated
  using (app.is_platform_staff() and (app.has_permission('team.view') or id in (select role_id from admin_users where user_id = auth.uid())));
create policy role_permissions_select on role_permissions for select to authenticated
  using (app.has_permission('team.view') or role_id in (select role_id from admin_users where user_id = auth.uid()));
create policy admin_invites_select on admin_invites for select to authenticated using (app.has_permission('team.view'));

-- Configuration. Customers read published legal documents; everything else flows through app_config.
grant select on platform_settings, legal_documents, onboarding_slides, faqs, translations, notification_templates,
  cities, cuisines, dish_categories, report_reasons, feature_flags, breach_log, badge_definitions to authenticated;
grant select (provider, kind, status, public_config, secret_hints, is_active, last_test_at, last_test_ok, last_test_message, updated_at, created_at) on integrations to authenticated;

create policy platform_settings_select on platform_settings for select to authenticated using (app.has_permission('settings.view'));
create policy legal_documents_select on legal_documents for select to authenticated
  using (published_at is not null or app.has_permission('content.view'));
create policy onboarding_slides_select on onboarding_slides for select to authenticated using (app.has_permission('content.view'));
create policy faqs_select on faqs for select to authenticated using (app.has_permission('content.view'));
create policy translations_select on translations for select to authenticated using (app.has_permission('content.view'));
create policy notification_templates_select on notification_templates for select to authenticated using (app.has_permission('content.view'));
create policy cities_select on cities for select to authenticated using (true);
create policy cuisines_select on cuisines for select to authenticated using (true);
create policy dish_categories_select on dish_categories for select to authenticated using (true);
create policy report_reasons_select on report_reasons for select to authenticated using (true);
create policy feature_flags_select on feature_flags for select to authenticated using (app.has_permission('master_data.view'));
create policy badge_definitions_select on badge_definitions for select to authenticated using (true);
create policy integrations_select on integrations for select to authenticated using (app.has_permission('integrations.view'));
create policy breach_log_select on breach_log for select to authenticated using (app.has_permission('data_requests.view'));

grant select on config_version to anon, authenticated;
create policy config_version_select on config_version for select to anon, authenticated using (true);

grant select on audit_log, error_log to authenticated;
create policy audit_log_select on audit_log for select to authenticated using (app.has_permission('audit.view'));
create policy error_log_select on error_log for select to authenticated using (app.has_permission('audit.view'));

-- Restaurants.
grant select on restaurants, restaurant_staff, restaurant_invites, menu_categories, menu_items, reward_levels to authenticated;
create policy restaurants_select on restaurants for select to authenticated
  using (status = 'approved' or app.is_restaurant_member(id, array['owner', 'manager', 'cashier']) or app.has_permission('restaurants.view'));
create policy restaurant_staff_select on restaurant_staff for select to authenticated
  using (user_id = auth.uid() or app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'));
create policy restaurant_invites_select on restaurant_invites for select to authenticated
  using (app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'));
create policy menu_categories_select on menu_categories for select to authenticated
  using (exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'approved')
    or app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'));
create policy menu_items_select on menu_items for select to authenticated
  using (exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'approved')
    or app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'));
create policy reward_levels_select on reward_levels for select to authenticated
  using (exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'approved')
    or app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('restaurants.view'));

-- Offers and codes.
grant select on offers, offer_waitlist, codes to authenticated;
create policy offers_select on offers for select to authenticated
  using (
    (status = 'active' and exists (select 1 from restaurants r where r.id = restaurant_id and r.status = 'approved'))
    or app.is_restaurant_member(restaurant_id, array['owner', 'manager'])
    or app.has_permission('offers.view')
  );
create policy offer_waitlist_own on offer_waitlist for select to authenticated using (user_id = auth.uid());
create policy codes_select on codes for select to authenticated
  using (holder_id = auth.uid() or app.has_permission('redemptions.view'));

-- Stories and ratings: own, accepted friends', restaurant staff for their restaurant, platform moderators.
grant select on checkins, stories, story_dishes, reports, polls, poll_options, poll_votes to authenticated;
create policy checkins_own on checkins for select to authenticated using (user_id = auth.uid());
create policy stories_select on stories for select to authenticated
  using (
    (deleted_at is null and expires_at > now() and (author_id = auth.uid() or app.are_friends(auth.uid(), author_id)))
    or app.has_permission('moderation.view')
  );
create policy story_dishes_select on story_dishes for select to authenticated
  using (exists (select 1 from stories s where s.id = story_id));
create policy reports_select on reports for select to authenticated
  using (reporter_id = auth.uid() or app.has_permission('moderation.view'));
create policy polls_select on polls for select to authenticated
  using (author_id = auth.uid() or app.are_friends(auth.uid(), author_id));
create policy poll_options_select on poll_options for select to authenticated
  using (exists (select 1 from polls p where p.id = poll_id));
create policy poll_votes_select on poll_votes for select to authenticated
  using (exists (select 1 from polls p where p.id = poll_id));

-- Visits and money.
grant select on visits, visit_members, redemptions, invoices, fee_ledger to authenticated;
create or replace function app.is_visit_member(vid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.visit_members m where m.visit_id = vid and m.user_id = auth.uid())
    or exists (select 1 from public.visits v where v.id = vid and v.host_id = auth.uid());
$$;
create policy visits_select on visits for select to authenticated
  using (
    app.is_visit_member(id)
    or app.is_restaurant_member(restaurant_id, array['owner', 'manager'])
    or app.has_permission('redemptions.view')
  );
create policy visit_members_select on visit_members for select to authenticated
  using (user_id = auth.uid() or app.is_visit_member(visit_id));
create policy redemptions_select on redemptions for select to authenticated
  using (app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('redemptions.view'));
create policy invoices_select on invoices for select to authenticated
  using (app.is_restaurant_member(restaurant_id, array['owner']) or app.has_permission('billing.view'));
create policy fee_ledger_select on fee_ledger for select to authenticated
  using (app.is_restaurant_member(restaurant_id, array['owner']) or app.has_permission('billing.view'));

-- Rewards.
grant select on referral_credits, user_rewards, badge_awards to authenticated;
create policy referral_credits_select on referral_credits for select to authenticated
  using (referrer_id = auth.uid() or app.has_permission('redemptions.view'));
create policy user_rewards_select on user_rewards for select to authenticated
  using (user_id = auth.uid() or app.is_restaurant_member(restaurant_id, array['owner', 'manager']));
create policy badge_awards_select on badge_awards for select to authenticated
  using (user_id = auth.uid() or app.are_friends(auth.uid(), user_id));

-- Boosts.
grant select on sponsored_placements, placement_events to authenticated;
create policy sponsored_select on sponsored_placements for select to authenticated
  using (app.is_restaurant_member(restaurant_id, array['owner', 'manager']) or app.has_permission('boosts.view'));
create policy placement_events_select on placement_events for select to authenticated
  using (app.has_permission('boosts.view'));

-- Notifications and privacy.
grant select, update (read_at) on notifications to authenticated;
create policy notifications_own on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_mark_read on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on notification_log, campaigns to authenticated;
create policy notification_log_select on notification_log for select to authenticated using (app.has_permission('notifications.view'));
create policy campaigns_select on campaigns for select to authenticated using (app.has_permission('notifications.view'));
grant select on consent_log, data_requests, fraud_flags to authenticated;
create policy consent_log_own on consent_log for select to authenticated using (user_id = auth.uid());
create policy data_requests_select on data_requests for select to authenticated
  using (user_id = auth.uid() or app.has_permission('data_requests.view'));
create policy fraud_flags_select on fraud_flags for select to authenticated using (app.has_permission('fraud.view'));

-- Realtime publications exist only on Supabase; skip elsewhere.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table offers, notifications, redemptions, config_version;
  end if;
end $$;
