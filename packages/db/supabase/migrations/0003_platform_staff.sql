-- Platform staff: roles built from permission keys, members and invitations.
create table admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger admin_roles_updated_at before update on admin_roles for each row execute function app.set_updated_at();

create table role_permissions (
  role_id uuid not null references admin_roles (id) on delete cascade,
  permission text not null,
  primary key (role_id, permission)
);

create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role_id uuid not null references admin_roles (id),
  name text not null,
  email citext not null unique,
  mfa_enrolled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_users_role_idx on admin_users (role_id);
create trigger admin_users_updated_at before update on admin_users for each row execute function app.set_updated_at();

create table admin_invites (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role_id uuid not null references admin_roles (id),
  invited_by uuid references admin_users (user_id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index admin_invites_email_idx on admin_invites (email) where accepted_at is null;

-- The system role used by the bootstrap command. It is configuration, not data.
insert into admin_roles (name, is_system) values ('Superadmin', true);

create or replace function app.is_platform_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users u where u.user_id = auth.uid());
$$;

create or replace function app.has_mfa() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function app.has_permission(perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.has_mfa() and (
    exists (
      select 1 from public.admin_users u
      join public.admin_roles r on r.id = u.role_id
      where u.user_id = auth.uid() and r.is_system
    )
    or exists (
      select 1 from public.admin_users u
      join public.role_permissions p on p.role_id = u.role_id
      where u.user_id = auth.uid() and p.permission = perm
    )
  );
$$;

create or replace function app.require_permission(perm text) returns void
language plpgsql stable as $$
begin
  if auth.uid() is null then perform app.fail('not_authenticated'); end if;
  if not app.is_platform_staff() then perform app.fail('not_permitted'); end if;
  if not app.has_mfa() then perform app.fail('mfa_required'); end if;
  if not app.has_permission(perm) then perform app.fail('not_permitted'); end if;
end $$;
