import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDatabase, type TestDatabase } from '../harness';
import { as, expectFail, type Actor } from '../helpers';
import { befriend, buildWorld, createCustomer, postStoryAs, q, type World } from '../world';

let db: TestDatabase;
let w: World;
let author: Actor;
let storyId: string;
let n = 100;

const customer = (handle: string) => createCustomer(db.client, n++, handle);
const issue = async (actor: Actor, story = storyId) =>
  (await as(db.client, actor, () => q(db.client, 'select issue_code($1) r', [story]))).rows[0].r as {
    ok: boolean;
    reason?: string;
    code?: { id: string; short_code: string };
    remaining?: number;
  };

beforeAll(async () => {
  db = await startTestDatabase(54333);
  w = await buildWorld(db.client);
  author = await customer('author');
  storyId = await postStoryAs(db.client, author, w);
});
afterAll(async () => {
  await db.stop();
});

describe('story visibility and code issue', () => {
  it('shows a story only to accepted friends', async () => {
    const friend = await customer('friend_a');
    const stranger = await customer('stranger_a');
    await befriend(db.client, author, friend);
    const seen = async (a: Actor) => (await as(db.client, a, () => q(db.client, 'select id from stories where id = $1', [storyId]))).rowCount;
    expect(await seen(friend)).toBe(1);
    expect(await seen(stranger)).toBe(0);
  });

  it('gives a friend a personal 4-digit code and counts it', async () => {
    const b = await customer('friend_b');
    await befriend(db.client, author, b);
    const result = await issue(b);
    expect(result.ok).toBe(true);
    expect(result.code?.short_code).toMatch(/^\d{4}$/);
    expect(result.remaining).toBe(19);
  });

  it('refuses a non-friend, the author, and a holder who already has a code', async () => {
    const stranger = await customer('stranger_b');
    expect((await issue(stranger)).reason).toBe('code_not_friend');
    expect((await issue(author)).reason).toBe('code_is_author');
    const c = await customer('friend_c');
    await befriend(db.client, author, c);
    expect((await issue(c)).ok).toBe(true);
    expect((await issue(c)).reason).toBe('code_already_held');
  });

  it('refuses a returning customer as ineligible', async () => {
    const d = await customer('returning');
    await befriend(db.client, author, d);
    const first = await issue(d);
    await as(db.client, w.cashier, () =>
      q(db.client, 'select redeem_code($1, $2, null, 60000, $3)', [w.restaurantId, first.code?.short_code, 'key-returning-1']),
    );
    await q(db.client, "update redemptions set created_at = now() - interval '1 hour' where idempotency_key = 'key-returning-1'");
    await q(db.client, 'select app.verify_due_redemptions()');
    const again = await issue(d);
    expect(again.reason).toBe('code_not_new_customer');
  });

  it('applies rate limits and flags rapid requests', async () => {
    const spammer = await customer('spammer');
    await befriend(db.client, author, spammer);
    let reason = '';
    for (let i = 0; i < 12; i += 1) reason = (await issue(spammer, '00000000-0000-0000-0000-000000000000')).reason ?? '';
    expect(reason).toBe('code_rate_limited');
    const flags = await q(db.client, "select count(*)::int n from fraud_flags where kind = 'rapid_requests' and user_id = $1", [spammer.id]);
    expect(flags.rows[0].n).toBe(1);
  });
});

describe('overselling', () => {
  it('fifty parallel requests for the last twenty codes produce exactly twenty', async () => {
    const world = await buildWorld(db.client);
    const storyAuthor = await customer('conc_author');
    const story = await postStoryAs(db.client, storyAuthor, world);
    const requesters: Actor[] = [];
    for (let i = 0; i < 50; i += 1) {
      const u = await customer(`conc_${i}`);
      await befriend(db.client, storyAuthor, u);
      requesters.push(u);
    }
    const clients = await Promise.all(
      requesters.map(async (u) => {
        const c = new pg.Client({ connectionString: db.connectionString });
        await c.connect();
        await as(c, u, async () => undefined);
        await c.query('select set_config($1, $2, false), set_config($3, $4, false)', [
          'request.jwt.claim.sub', u.id, 'request.jwt.claims', JSON.stringify({ sub: u.id, aal: 'aal1', role: 'authenticated' }),
        ]);
        await c.query('set role authenticated');
        return c;
      }),
    );
    const results = await Promise.all(clients.map((c) => c.query('select issue_code($1) r', [story])));
    await Promise.all(clients.map((c) => c.end()));
    const ok = results.filter((r) => r.rows[0].r.ok === true).length;
    const soldOut = results.filter((r) => r.rows[0].r.reason === 'offer_sold_out').length;
    expect(ok).toBe(20);
    expect(soldOut).toBe(30);
    const row = (await q(db.client, 'select codes_issued, (select count(*)::int from codes where offer_id = $1) c from offers where id = $1', [world.offerId])).rows[0];
    expect(row.codes_issued).toBe(20);
    expect(row.c).toBe(20);
  }, 120000);
});

describe('redemption', () => {
  let holder: Actor;
  let code: { id: string; short_code: string };

  beforeAll(async () => {
    holder = await customer('holder');
    await befriend(db.client, author, holder);
    code = (await issue(holder)).code as { id: string; short_code: string };
  });

  const redeem = (key: string, bill: number, actor: Actor = w.cashier, short: string | null = code.short_code) =>
    as(db.client, actor, () =>
      q(db.client, 'select redeem_code($1, $2, null, $3, $4) r', [w.restaurantId, short, bill, key]),
    ).then((r) => r.rows[0].r as Record<string, unknown>);

  it('rejects a bill below the minimum', async () => {
    expect((await redeem('key-below-min-1', 10000)).reason).toBe('bill_below_minimum');
  });

  it('matches the preview to the paisa and cannot be used twice', async () => {
    const preview = (await as(db.client, w.owner, () => q(db.client, 'select preview_redemption($1, $2, 123456) p', [w.restaurantId, w.offerId]))).rows[0].p;
    const res = await redeem('key-main-0001', 123456);
    expect(res.ok).toBe(true);
    expect(res.discount_paise).toBe(preview.discount_paise);
    expect(res.fee_paise).toBe(preview.fee_paise);
    expect(res.restaurant_keeps_paise).toBe(preview.restaurant_keeps_paise);
    expect(preview.discount_paise).toBe(20000);
    expect(preview.fee_paise).toBe(12346);
    expect(preview.restaurant_keeps_paise).toBe(123456 - 20000 - 12346);
    expect((await redeem('key-main-0002', 123456)).reason).toBe('code_used');
  });

  it('does not double-charge when the same idempotency key is repeated', async () => {
    const again = await redeem('key-main-0001', 123456);
    expect(again.replayed).toBe(true);
    const n = (await q(db.client, 'select count(*)::int n from redemptions where idempotency_key = $1', ['key-main-0001'])).rows[0].n;
    expect(n).toBe(1);
  });

  it('lets a cashier undo inside the window and restores the code', async () => {
    const id = (await q(db.client, "select id from redemptions where idempotency_key = 'key-main-0001'")).rows[0].id;
    await as(db.client, w.cashier, () => q(db.client, 'select reverse_redemption($1)', [id]));
    expect((await q(db.client, 'select status from codes where id = $1', [code.id])).rows[0].status).toBe('issued');
    const res = await redeem('key-main-0003', 80000);
    expect(res.ok).toBe(true);
  });

  it('after the window only a manager can reverse, with a reason, and credits are voided', async () => {
    const id = (await q(db.client, "select id from redemptions where idempotency_key = 'key-main-0003'")).rows[0].id;
    await q(db.client, "update redemptions set created_at = now() - interval '1 hour' where id = $1", [id]);
    await q(db.client, 'select app.verify_due_redemptions()');
    expect((await q(db.client, 'select count(*)::int n from fee_ledger where redemption_id = $1 and status = $2', [id, 'accrued'])).rows[0].n).toBe(1);
    expect((await q(db.client, "select count(*)::int n from referral_credits where redemption_id = $1 and status = 'held'", [id])).rows[0].n).toBe(1);

    await expectFail(as(db.client, w.cashier, () => q(db.client, 'select reverse_redemption($1, $2)', [id, 'customer disputed'])), 'undo_window_passed');
    await expectFail(as(db.client, w.manager, () => q(db.client, 'select reverse_redemption($1)', [id])), 'invalid_input');
    await as(db.client, w.manager, () => q(db.client, 'select reverse_redemption($1, $2)', [id, 'Customer disputed the bill']));
    expect((await q(db.client, "select count(*)::int n from referral_credits where redemption_id = $1 and status = 'void'", [id])).rows[0].n).toBe(1);
    expect((await q(db.client, "select count(*)::int n from fee_ledger where redemption_id = $1 and status = 'void'", [id])).rows[0].n).toBe(1);
    expect((await q(db.client, 'select status from codes where id = $1', [code.id])).rows[0].status).toBe('void');
  });
});

describe('credits and rewards', () => {
  it('holds credits, releases them after the hold, unlocks a level, and only that restaurant can use it', async () => {
    const world = await buildWorld(db.client);
    const promoter = await customer('promoter');
    const story = await postStoryAs(db.client, promoter, world);
    await as(db.client, world.owner, () => q(db.client, "select save_reward_level($1, null, $2::jsonb)", [world.restaurantId, JSON.stringify({ friends_required: 2, type: 'free_item', value: 0, label: 'Free dessert' })]));
    for (let i = 0; i < 2; i += 1) {
      const friend = await customer(`credit_friend_${i}`);
      await befriend(db.client, promoter, friend);
      const issued = (await as(db.client, friend, () => q(db.client, 'select issue_code($1) r', [story]))).rows[0].r;
      await as(db.client, world.cashier, () => q(db.client, 'select redeem_code($1, $2, null, 70000, $3)', [world.restaurantId, issued.code.short_code, `key-credit-${i}-aaaa`]));
    }
    await q(db.client, "update redemptions set created_at = now() - interval '1 hour' where restaurant_id = $1", [world.restaurantId]);
    await q(db.client, 'select app.verify_due_redemptions()');
    await q(db.client, 'select app.release_held_credits()');
    expect((await q(db.client, "select count(*)::int n from user_rewards where user_id = $1", [promoter.id])).rows[0].n).toBe(0);

    await q(db.client, "update referral_credits set release_at = now() - interval '1 minute' where restaurant_id = $1", [world.restaurantId]);
    await q(db.client, 'select app.release_held_credits()');
    const reward = (await as(db.client, promoter, () => q(db.client, 'select id, status from user_rewards where user_id = $1', [promoter.id]))).rows[0];
    expect(reward.status).toBe('available');

    await expectFail(as(db.client, w.cashier, () => q(db.client, 'select mark_reward_used($1)', [reward.id])), 'reward_wrong_restaurant');
    await as(db.client, world.cashier, () => q(db.client, 'select mark_reward_used($1)', [reward.id]));
    expect((await q(db.client, 'select status from user_rewards where id = $1', [reward.id])).rows[0].status).toBe('used');
  });
});
