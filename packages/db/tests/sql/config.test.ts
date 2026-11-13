import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDatabase, type TestDatabase } from '../harness';
import { as, createSuperadmin, createUser, expectFail, type Actor } from '../helpers';

let db: TestDatabase;
let admin: Actor;
let nobody: Actor;

beforeAll(async () => {
  db = await startTestDatabase(54332);
  admin = await createSuperadmin(db.client);
  nobody = { id: await createUser(db.client, '+919800000001') };
});
afterAll(async () => {
  await db.stop();
});

const q = (sql: string, params: unknown[] = []) => db.client.query(sql, params);
const setting = (actor: Actor, key: string, value: string) =>
  as(db.client, actor, () => q('select update_setting($1, $2::jsonb)', [key, value]));

describe('update_setting', () => {
  it('changes a value, bumps the config version and writes an audit row', async () => {
    const before = (await q('select version from config_version')).rows[0].version;
    await setting(admin, 'reward_hold_days', '5');
    const after = (await q('select version from config_version')).rows[0].version;
    expect(Number(after)).toBeGreaterThan(Number(before));
    const audit = (
      await q("select before, after from audit_log where entity = 'setting' and entity_id = 'reward_hold_days'")
    ).rows[0];
    expect(audit.before.value).toBe(3);
    expect(audit.after.value).toBe(5);
  });

  it('rejects values outside bounds, wrong types and unknown keys', async () => {
    await expectFail(setting(admin, 'reward_hold_days', '1000'), 'value_out_of_bounds');
    await expectFail(setting(admin, 'reward_hold_days', '"x"'), 'setting_invalid');
    await expectFail(setting(admin, 'nope', '1'), 'setting_unknown');
  });

  it('keeps the default fee inside the min and max', async () => {
    await expectFail(setting(admin, 'fee_percent_max', '8'), 'value_out_of_bounds');
  });

  it('refuses callers without permission or two-factor', async () => {
    await expectFail(setting(nobody, 'reward_hold_days', '4'), 'not_permitted');
    await expectFail(setting({ ...admin, aal2: false }, 'reward_hold_days', '4'), 'mfa_required');
  });
});

describe('app_config and the checklist', () => {
  it('is public, versioned and not launch-ready on an empty system', async () => {
    const cfg = (await as(db.client, null, () => q('select app_config() c'))).rows[0].c;
    expect(cfg.version).toBeTruthy();
    expect(cfg.launch_ready).toBe(false);
    expect(cfg.integrations.sms).toBe(false);
    expect(cfg.settings.reward_hold_days).toBe(5);
    expect(cfg.settings.bank_details).toBeUndefined();
    const checklist = (await as(db.client, admin, () => q('select go_live_checklist() c'))).rows[0]
      .c as { ok: boolean }[];
    expect(checklist.some((i) => !i.ok)).toBe(true);
  });

  it('turns the legal item green once every document is published', async () => {
    for (const kind of ['terms', 'privacy', 'merchant_agreement', 'rewards_policy', 'community_guidelines']) {
      await as(db.client, admin, () =>
        q('select save_legal_draft($1, $2, $3)', [kind, kind, `Body text for ${kind}`]),
      );
      await as(db.client, admin, () => q('select publish_legal_document($1)', [kind]));
    }
    const checklist = (await as(db.client, admin, () => q('select go_live_checklist() c'))).rows[0]
      .c as { key: string; ok: boolean }[];
    expect(checklist.find((i) => i.key === 'legal')?.ok).toBe(true);
    const cfg = (await q('select app_config() c')).rows[0].c;
    expect(cfg.legal).toHaveLength(5);
  });
});

describe('master data and integrations', () => {
  it('saves, updates and deletes a city with audit rows', async () => {
    const data = JSON.stringify({ name: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.85 });
    const created = (
      await as(db.client, admin, () => q('select admin_save($1, null, $2::jsonb) r', ['city', data]))
    ).rows[0].r;
    await as(db.client, admin, () =>
      q('select admin_save($1, $2, $3::jsonb)', ['city', created.id, '{"is_active":false}']),
    );
    expect((await q('select is_active from cities where id = $1', [created.id])).rows[0].is_active).toBe(false);
    await as(db.client, admin, () => q('select admin_delete($1, $2)', ['city', created.id]));
    const n = (await q("select count(*)::int n from audit_log where entity = 'city'")).rows[0].n;
    expect(n).toBe(3);
  });

  it('refuses an unknown entity and a caller without permission', async () => {
    await expectFail(as(db.client, admin, () => q("select admin_save('profiles', null, '{}'::jsonb)")), 'invalid_input');
    await expectFail(
      as(db.client, nobody, () => q("select admin_save('cuisine', null, $1::jsonb)", ['{"name":"Thai"}'])),
      'not_permitted',
    );
  });

  it('stores secrets in the vault and exposes only hints', async () => {
    await as(db.client, admin, () =>
      q('select set_integration($1, $2, $3::jsonb, $4::jsonb)', [
        'sms_msg91',
        'sms',
        '{"sender_id":"ABCDEF"}',
        '{"auth_key":"supersecret1234"}',
      ]),
    );
    const row = (
      await as(db.client, admin, () =>
        q('select provider, secret_hints, public_config from integrations where provider = $1', ['sms_msg91']),
      )
    ).rows[0];
    expect(row.secret_hints.auth_key).toBe('1234');
    expect(JSON.stringify(row)).not.toContain('supersecret');
    await expectFail(
      as(db.client, admin, () => q('select vault_secret_id from integrations')),
      'permission denied for table integrations',
    );
  });

  it('flips the SMS item only after a successful test', async () => {
    const before = (await as(db.client, null, () => q('select app_config() c'))).rows[0].c;
    expect(before.integrations.sms).toBe(false);
    await q("select record_integration_test('sms_msg91', true, 'ok')");
    const after = (await as(db.client, null, () => q('select app_config() c'))).rows[0].c;
    expect(after.integrations.sms).toBe(true);
  });

  it('does not let clients call the test recorder or internal helpers', async () => {
    await expectFail(
      as(db.client, admin, () => q("select record_integration_test('sms_msg91', true, 'forged')")),
      'permission denied for function record_integration_test',
    );
    await expectFail(
      as(db.client, admin, () => q("select app.audit('x', 'y', 'z', null, null)")),
      'permission denied for function audit',
    );
  });
});

describe('login lockout', () => {
  it('locks after repeated failures, reports the wait, and clears on success', async () => {
    const mail = 'someone@test.invalid';
    for (let i = 0; i < 5; i += 1) await as(db.client, null, () => q("select login_record($1, false)", [mail]));
    const wait = Number((await as(db.client, null, () => q('select login_lock_seconds($1) s', [mail]))).rows[0].s);
    expect(wait).toBeGreaterThan(0);
    await q("update login_attempts set locked_until = null");
    await as(db.client, null, () => q("select login_record($1, true)", [mail]));
    expect(Number((await as(db.client, null, () => q('select login_lock_seconds($1) s', [mail]))).rows[0].s)).toBe(0);
  });
});
