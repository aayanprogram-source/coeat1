import { readServerEnv } from '@datapal/core';
import pg from 'pg';
import { applyMigrations } from '../src/migrations';

const env = readServerEnv(process.env);
const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();
const applied = await applyMigrations(client);
await client.end();
process.stdout.write(applied.length ? `Applied: ${applied.join(', ')}\n` : 'Database is up to date\n');
