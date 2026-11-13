import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { applyMigrations } from '../src/migrations';

// The Supabase platform provides the auth schema; a disposable test database needs the minimum of it.
const supabasePlatformStub = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), phone text, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
create schema if not exists vault;
create table if not exists vault.secrets (id uuid primary key default gen_random_uuid(), name text, secret text);
create or replace function vault.create_secret(secret text, name text default null, description text default '') returns uuid language sql as $$ insert into vault.secrets (name, secret) values (name, secret) returning id $$;
create or replace function vault.update_secret(id uuid, secret text) returns void language sql as $$ update vault.secrets s set secret = update_secret.secret where s.id = update_secret.id $$;
create or replace view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
`;

export interface TestDatabase {
  client: pg.Client;
  connectionString: string;
  stop: () => Promise<void>;
}

export async function startTestDatabase(port: number): Promise<TestDatabase> {
  const dir = mkdtempSync(join(tmpdir(), 'datapal-pg-'));
  const server = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: false });
  await server.initialise();
  await server.start();
  const connectionString = `postgres://postgres:postgres@localhost:${port}/postgres`;
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query(supabasePlatformStub);
  await applyMigrations(client);
  return {
    client,
    connectionString,
    stop: async () => {
      await client.end();
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
