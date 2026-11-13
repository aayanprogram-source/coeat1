import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { email as emailSchema, password as passwordSchema, readServerEnv } from '@datapal/core';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

function ask(question: string, hidden = false): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

const env = readServerEnv(process.env);
const db = new pg.Client({ connectionString: env.DATABASE_URL });
await db.connect();

try {
  const existing = await db.query<{ n: string }>(
    'select count(*) n from admin_users u join admin_roles r on r.id = u.role_id where r.is_system',
  );
  if (Number(existing.rows[0]?.n) > 0) {
    process.stderr.write('A superadmin already exists. This command only runs once.\n');
    process.exitCode = 1;
  } else {
    const name = await ask('Full name: ');
    const email = emailSchema.parse(await ask('Email: '));
    const password = passwordSchema.parse(await ask('Password (at least 10 characters): ', true));
    if (name.length < 2) throw new Error('Name is required');

    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`Could not create the user: ${error.message}`);

    await db.query(
      `insert into admin_users (user_id, role_id, name, email)
       select $1, id, $2, $3 from admin_roles where is_system`,
      [data.user.id, name, email],
    );
    await db.query(
      "insert into audit_log (actor_id, entity, entity_id, action, after) values ($1, 'admin_user', $1::text, 'bootstrap', $2::jsonb)",
      [data.user.id, JSON.stringify({ email })],
    );
    process.stdout.write(
      'Superadmin created. Sign in to the admin dashboard; you will be asked to set up two-factor authentication.\n',
    );
  }
} finally {
  await db.end();
}
