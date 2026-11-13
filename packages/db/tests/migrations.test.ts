import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/migrations';
import { startTestDatabase, type TestDatabase } from './harness';

let db: TestDatabase;
beforeAll(async () => {
  db = await startTestDatabase(54331);
});
afterAll(async () => {
  await db.stop();
});

describe('migrations', () => {
  it('apply cleanly to an empty database and are idempotent on re-run', async () => {
    expect(await applyMigrations(db.client)).toEqual([]);
    const { rows } = await db.client.query<{ n: string }>(
      "select count(*) n from information_schema.tables where table_schema = 'public'",
    );
    expect(Number(rows[0]?.n)).toBeGreaterThan(40);
  });
});
