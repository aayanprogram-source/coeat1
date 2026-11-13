import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Client } from 'pg';

export const migrationsDir = join(import.meta.dirname, '..', 'supabase', 'migrations');

export async function applyMigrations(client: Client): Promise<string[]> {
  await client.query(
    'create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  const done = new Set(
    (await client.query<{ name: string }>('select name from public.schema_migrations')).rows.map((r) => r.name),
  );
  const applied: string[] = [];
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await client.query('begin');
    try {
      await client.query(readFileSync(join(migrationsDir, file), 'utf8'));
      await client.query('insert into public.schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      applied.push(file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return applied;
}
