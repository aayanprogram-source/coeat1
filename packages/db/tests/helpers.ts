import type pg from 'pg';

export interface Actor {
  id: string;
  aal2?: boolean;
}

export async function createUser(client: pg.Client, phone: string | null = null): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    'insert into auth.users (phone, email) values ($1, $2) returning id',
    [phone, phone ? null : `${Math.random().toString(36).slice(2)}@test.invalid`],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error('user not created');
  return id;
}

export async function createSuperadmin(client: pg.Client): Promise<Actor> {
  const id = await createUser(client);
  await client.query(
    `insert into admin_users (user_id, role_id, name, email, mfa_enrolled)
     select $1::uuid, id, 'Test Admin', 'admin-' || $1::text || '@test.invalid', true from admin_roles where is_system`,
    [id],
  );
  return { id, aal2: true };
}

export async function as<T>(client: pg.Client, actor: Actor | null, fn: () => Promise<T>): Promise<T> {
  const claims = JSON.stringify({
    sub: actor?.id,
    aal: actor?.aal2 ? 'aal2' : 'aal1',
    role: actor ? 'authenticated' : 'anon',
  });
  await client.query('select set_config($1, $2, false), set_config($3, $4, false)', [
    'request.jwt.claim.sub',
    actor?.id ?? '',
    'request.jwt.claims',
    actor ? claims : '',
  ]);
  await client.query(`set role ${actor ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

export async function expectFail(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== code) throw new Error(`Expected error "${code}" but got "${message}"`);
    return;
  }
  throw new Error(`Expected error "${code}" but the call succeeded`);
}
