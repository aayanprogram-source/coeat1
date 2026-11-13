import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDatabase, type TestDatabase } from '../harness';
import { as, createUser, expectFail, type Actor } from '../helpers';
import { befriend, buildWorld, createCustomer, postStoryAs, q, type World } from '../world';

let db: TestDatabase;
let w: World;
let n = 500;
const c = () => db.client;
const customer = (handle: string) => createCustomer(c(), n++, handle);
const rpc = async (actor: Actor | null, sql: string, params: unknown[] = []) => (await as(c(), actor, () => q(c(), sql, params))).rows[0];

async function redeemFor(world: World, story: string, friend: Actor, bill: number, key: string, visitId?: string) {
  const issued = (await rpc(friend, 'select issue_code($1) r', [story])).r;
  expect(issued.ok, JSON.stringify(issued)).toBe(true);
  const r = (await rpc(world.cashier, 'select redeem_code($1, $2, null, $3, $4, null, $5) r', [world.restaurantId, issued.code.short_code, bill, key, visitId ?? null])).r;
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r as { redemption_id: string };
}

async function settle(world: World) {
  await q(c(), "update redemptions set created_at = now() - interval '1 hour' where restaurant_id = $1 and status = 'pending'", [world.restaurantId]);
  await q(c(), 'select app.verify_due_redemptions()');
}

beforeAll(async () => {
  db = await startTestDatabase(54340);
  w = await buildWorld(c());
});
afterAll(async () => {
  await db.stop();
});

describe('group visits', () => {
  it('counts one bill, applies the discount once, and respects the group credit cap', async () => {
    const world = await buildWorld(c(), { group_credit_cap: 2 });
    const promoter = await customer('grp_promoter');
    const story = await postStoryAs(c(), promoter, world);
    const host = await customer('grp_host');
    await befriend(c(), promoter, host);
    const others: Actor[] = [];
    for (let i = 0; i < 3; i += 1) others.push(await customer(`grp_member_${i}`));

    await as(c(), host, () => q(c(), 'select check_in($1, 12.97, 77.59)', [world.restaurantId]));
    const visit = (await rpc(host, 'select start_group_visit($1, $2) v', [world.restaurantId, 'T4'])).v;
    for (const m of others) await rpc(m, 'select join_group_visit($1)', [visit.join_token]);

    const r = await redeemFor(world, story, host, 90000, 'key-group-0001', visit.id);
    await settle(world);

    const redemptions = (await q(c(), 'select count(*)::int n, sum(discount_paise)::int d from redemptions where visit_id = $1', [visit.id])).rows[0];
    expect(redemptions.n).toBe(1);
    expect(redemptions.d).toBe(18000);
    const credits = (await q(c(), 'select count(*)::int n from referral_credits where redemption_id = $1', [r.redemption_id])).rows[0].n;
    expect(credits).toBe(2);
    expect((await q(c(), 'select status from visits where id = $1', [visit.id])).rows[0].status).toBe('verified');
  });
});

describe('invoicing', () => {
  it('produces correct sequential invoices, a once-only payment webhook, and a matching accountant export', async () => {
    const world = await buildWorld(c());
    await as(c(), world.admin, () => q(c(), "select update_setting('invoice_prefix', '\"ACME\"')"));
    const promoter = await customer('inv_promoter');
    const story = await postStoryAs(c(), promoter, world);
    for (let i = 0; i < 3; i += 1) {
      const f = await customer(`inv_friend_${i}`);
      await befriend(c(), promoter, f);
      await redeemFor(world, story, f, 100000 + i * 1000, `key-invoice-${i}-aaaa`);
    }
    await settle(world);
    const ledger = (await q(c(), "select sum(fee_paise)::int fee, sum(gst_paise)::int gst from fee_ledger where restaurant_id = $1 and status = 'accrued'", [world.restaurantId])).rows[0];
    expect(ledger.fee).toBe(10000 + 10100 + 10200);

    const period = new Date().toISOString().slice(0, 10);
    expect(Number((await rpc(world.admin, 'select generate_invoices($1::date) n', [period])).n)).toBeGreaterThanOrEqual(1);
    expect(Number((await rpc(world.admin, 'select generate_invoices($1::date) n', [period])).n)).toBe(0);

    const inv = (await q(c(), 'select * from invoices where restaurant_id = $1', [world.restaurantId])).rows[0];
    expect(inv.number).toMatch(/^ACME-\d{6}$/);
    expect(Number(inv.subtotal_paise)).toBe(ledger.fee);
    expect(Number(inv.gst_paise)).toBe(ledger.gst);
    expect(Number(inv.total_paise)).toBe(Number(ledger.fee) + Number(ledger.gst));

    await q(c(), "update invoices set payment_link_id = 'plink_1' where id = $1", [inv.id]);
    expect((await q(c(), "select record_payment_event('evt_1', 'plink_1', '{}'::jsonb) r")).rows[0].r).toBe(true);
    expect((await q(c(), "select record_payment_event('evt_1', 'plink_1', '{}'::jsonb) r")).rows[0].r).toBe(false);
    expect((await q(c(), 'select status from invoices where id = $1', [inv.id])).rows[0].status).toBe('paid');
    await expectFail(rpc(world.admin, "select mark_invoice_paid($1, 'UTR12345')", [inv.id]), 'invoice_already_paid');

    const csv = (await rpc(world.admin, "select accountant_export(current_date - 1, current_date + 1) r")).r as { total_paise: number }[];
    const exported = csv.filter((row) => row.total_paise === Number(ledger.fee) + Number(ledger.gst));
    expect(exported).toHaveLength(1);
  });
});

describe('privacy and legal', () => {
  it('exports data and deletes an account, keeping only anonymised financial records', async () => {
    const world = await buildWorld(c());
    const promoter = await customer('prv_promoter');
    const story = await postStoryAs(c(), promoter, world);
    const friend = await customer('prv_friend');
    await befriend(c(), promoter, friend);
    await redeemFor(world, story, friend, 80000, 'key-privacy-0001');
    await settle(world);

    const exported = (await rpc(friend, 'select request_data_export() r')).r;
    expect(exported.redemptions).toHaveLength(1);
    await rpc(friend, 'select delete_account()');
    await q(c(), "update profiles set deleted_at = now() - interval '40 days' where id = $1", [friend.id]);
    await q(c(), 'select app.anonymise_deleted_accounts()');
    const p = (await q(c(), 'select name, handle, phone from profiles where id = $1', [friend.id])).rows[0];
    expect(p).toEqual({ name: 'Deleted user', handle: null, phone: null });
    expect((await q(c(), 'select count(*)::int n from redemptions where customer_id = $1', [friend.id])).rows[0].n).toBe(1);
    const kinds = (await q(c(), 'select kind, status from data_requests where user_id = $1 order by kind', [friend.id])).rows;
    expect(kinds).toEqual([{ kind: 'delete', status: 'fulfilled' }, { kind: 'export', status: 'fulfilled' }]);
  });

  it('prompts everyone to re-accept a new legal document version', async () => {
    const user = await customer('legal_user');
    expect((await rpc(user, "select pending_legal('customer') r")).r).toHaveLength(4);
    await rpc(user, "select accept_legal_documents('customer')");
    expect((await rpc(user, "select pending_legal('customer') r")).r).toHaveLength(0);
    await as(c(), w.admin, () => q(c(), "select save_legal_draft('terms', 'Terms v2', 'New terms body text')"));
    await as(c(), w.admin, () => q(c(), "select publish_legal_document('terms')"));
    const pending = (await rpc(user, "select pending_legal('customer') r")).r;
    expect(pending).toHaveLength(1);
    expect(pending[0].kind).toBe('terms');
    expect((await rpc(w.owner, "select pending_legal('restaurant') r")).r.map((d: { kind: string }) => d.kind)).toContain('merchant_agreement');
  });

  it('rejects onboarding without age confirmation or accepted documents', async () => {
    const fresh = await customer('fresh_user');
    await q(c(), 'update profiles set onboarding_done = false, age_confirmed = false where id = $1', [fresh.id]);
    await expectFail(rpc(fresh, "select complete_onboarding('Fresh User', 'fresh_name', null, false)"), 'age_not_confirmed');
    await expectFail(rpc(fresh, "select complete_onboarding('Fresh User', 'fresh_name', null, true)"), 'legal_not_accepted');
    await rpc(fresh, "select accept_legal_documents('customer')");
    await rpc(fresh, "select complete_onboarding('Fresh User', 'fresh_name', null, true)");
    expect((await q(c(), 'select onboarding_done from profiles where id = $1', [fresh.id])).rows[0].onboarding_done).toBe(true);
  });
});

describe('expiry, waitlist and fraud', () => {
  it('expires codes, hides expired stories, and notifies the waitlist when codes come back', async () => {
    const world = await buildWorld(c(), { total_codes: 1 });
    await as(c(), world.admin, () => q(c(), "select admin_save('notification_template', null, $1::jsonb)", [JSON.stringify({ event: 'new_drop', locale: 'en', title: '{restaurant} has codes', body: 'Grab one now' })]));
    const promoter = await customer('exp_promoter');
    const story = await postStoryAs(c(), promoter, world);
    const first = await customer('exp_first');
    const second = await customer('exp_second');
    await befriend(c(), promoter, first);
    await befriend(c(), promoter, second);
    expect((await rpc(first, 'select issue_code($1) r', [story])).r.ok).toBe(true);
    const refused = (await rpc(second, 'select issue_code($1) r', [story])).r;
    expect(refused.reason).toBe('offer_sold_out');
    await rpc(second, 'select join_waitlist($1)', [refused.offer_id]);
    await expectFail(rpc(second, 'select join_waitlist($1)', [refused.offer_id]), 'waitlist_already_joined');

    expect((await q(c(), 'select app.open_drops() n')).rows[0].n).toBe(0);
    await as(c(), world.owner, () => q(c(), 'select save_offer($1, $2, $3::jsonb)', [world.restaurantId, world.offerId, JSON.stringify({
      title: 'Welcome offer', discount_percent: 20, discount_cap_paise: 20000, min_bill_paise: 30000, total_codes: 5,
      starts_at: new Date(Date.now() - 3600_000).toISOString(), ends_at: new Date(Date.now() + 86400_000).toISOString(), drop_at: null, active_hours: [], group_credit_cap: 3 })]));
    expect((await q(c(), 'select app.open_drops() n')).rows[0].n).toBe(1);
    const inbox = (await as(c(), second, () => q(c(), 'select title from notifications where user_id = $1', [second.id]))).rows;
    expect(inbox).toEqual([{ title: `Test Kitchen has codes` }]);

    await q(c(), "update codes set expires_at = now() - interval '1 minute' where holder_id = $1", [first.id]);
    await q(c(), "update stories set expires_at = now() - interval '1 minute' where id = $1", [story]);
    await q(c(), 'select app.expire_items()');
    expect((await q(c(), 'select status from codes where holder_id = $1', [first.id])).rows[0].status).toBe('expired');
    expect((await as(c(), first, () => q(c(), 'select id from stories where id = $1', [story]))).rowCount).toBe(0);
    const shortCode = (await q(c(), 'select short_code from codes where holder_id = $1', [first.id])).rows[0].short_code;
    const late = await rpc(world.cashier, 'select redeem_code($1, $2, null, 90000, $3) r', [world.restaurantId, shortCode, 'key-expired-0001']);
    expect(late.r.reason).toBe('code_expired');
  });

  it('flags a device shared by many accounts and a restaurant whose bills sit far below menu prices', async () => {
    const accounts = [await customer('dev_a'), await customer('dev_b'), await customer('dev_c')];
    for (const a of accounts) await rpc(a, "select register_device('device-shared-1', 'android', null)");
    const world = await buildWorld(c(), { min_bill_paise: 20000 });
    await q(c(), 'update menu_items set price_paise = 200000 where restaurant_id = $1', [world.restaurantId]);
    const promoter = await customer('fraud_promoter');
    const story = await postStoryAs(c(), promoter, world);
    for (let i = 0; i < 5; i += 1) {
      const f = await customer(`fraud_friend_${i}`);
      await befriend(c(), promoter, f);
      await redeemFor(world, story, f, 25000, `key-fraud-${i}-aaaaa`);
    }
    await settle(world);
    expect(Number((await q(c(), 'select app.detect_fraud() n')).rows[0].n)).toBeGreaterThanOrEqual(2);
    const kinds = (await as(c(), world.admin, () => q(c(), "select kind from fraud_flags where status = 'open' order by kind"))).rows.map((r) => r.kind);
    expect(kinds).toContain('device_cluster');
    expect(kinds).toContain('bill_anomaly');
    expect(Number((await q(c(), 'select app.detect_fraud() n')).rows[0].n)).toBe(0);
  });
});

describe('row level security', () => {
  it('keeps each audience inside its own data', async () => {
    const other = await buildWorld(c());
    const promoter = await customer('rls_promoter');
    const story = await postStoryAs(c(), promoter, w);
    const holder = await customer('rls_holder');
    const stranger = await customer('rls_stranger');
    await befriend(c(), promoter, holder);
    await redeemFor(w, story, holder, 70000, 'key-rls-0001-aaaa');

    const count = async (actor: Actor | null, table: string) => Number((await as(c(), actor, () => q(c(), `select count(*)::int n from ${table}`))).rows[0].n);
    expect(await count(stranger, 'codes')).toBe(0);
    expect(await count(stranger, 'redemptions')).toBe(0);
    expect(await count(holder, 'redemptions')).toBe(0);
    expect(await count(holder, 'codes')).toBe(1);
    expect(await count(w.cashier, 'redemptions')).toBe(0);
    expect(await count(w.cashier, "offers where status <> 'active'")).toBe(0);
    expect(await count(w.manager, "offers where status = 'active'")).toBeGreaterThan(0);
    await expectFail(rpc(w.cashier, 'select duplicate_offer($1)', [w.offerId]), 'not_permitted');
    expect(await count(w.cashier, 'invoices')).toBe(0);
    expect(await count(w.manager, 'redemptions')).toBeGreaterThan(0);
    expect(await count(other.owner, 'redemptions')).toBe(0);
    expect(await count(other.owner, 'offers')).toBeGreaterThan(0);
    expect(await count(other.manager, 'fee_ledger')).toBe(0);
    await expectFail(rpc(w.cashier, 'select update_setting($1, $2::jsonb)', ['gst_percent', '12']), 'not_permitted');
    expect(await count(stranger, 'audit_log')).toBe(0);
    expect(await count(w.admin, 'audit_log')).toBeGreaterThan(0);
    await expectFail(as(c(), stranger, () => q(c(), "insert into codes (offer_id, restaurant_id, holder_id, short_code, expires_at) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), '1234', now())")), 'permission denied for table codes');
    await expectFail(rpc(w.cashier, 'select lookup_code($1, $2, null)', [other.restaurantId, '0000']), 'not_permitted');

    const limited = await createUser(c());
    await q(c(), "insert into admin_roles (name) values ('Billing only')");
    await q(c(), "insert into role_permissions (role_id, permission) select id, 'billing.view' from admin_roles where name = 'Billing only'");
    await q(c(), "insert into admin_users (user_id, role_id, name, email, mfa_enrolled) select $1, id, 'Limited', 'limited@test.invalid', true from admin_roles where name = 'Billing only'", [limited]);
    const staff: Actor = { id: limited, aal2: true };
    expect(await count(staff, 'invoices')).toBeGreaterThanOrEqual(0);
    expect(await count(staff, 'fraud_flags')).toBe(0);
    expect(await count(staff, 'redemptions')).toBe(0);
    await expectFail(rpc(staff, "select go_live_checklist()"), 'not_permitted');
  });
});

describe('boosts and sponsored placements', () => {
  it('quotes a price, appears labelled only when eligible, counts once per user per day, and bills per day', async () => {
    const world = await buildWorld(c());
    await as(c(), world.admin, () => q(c(), "select update_setting('sponsored_enabled', 'true')"));
    await as(c(), world.admin, () => q(c(), "select update_setting('sponsored_price_per_day_paise', '70000')"));
    const starts = new Date(Date.now() - 3600_000).toISOString();
    const ends = new Date(Date.now() + 2 * 86400_000).toISOString();

    const quote = (await rpc(world.owner, 'select quote_boost($1, $2, $3, $4) r', [world.restaurantId, world.cityId, starts, ends])).r;
    expect(quote.price_paise).toBe(quote.days * 70000);

    const boostId = (await rpc(world.owner, "select create_boost($1, 'feed', $2, $3, $4) id", [world.offerId, world.cityId, starts, ends])).id;
    const viewer = await customer('boost_viewer');
    await q(c(), 'update profiles set city_id = $2 where id = $1', [viewer.id, world.cityId]);
    const author = await customer('boost_author');
    await befriend(c(), author, viewer);
    await q(c(), 'update profiles set city_id = $2 where id = $1', [author.id, world.cityId]);
    await postStoryAs(c(), author, world);

    const feedSponsored = async () => ((await rpc(viewer, "select get_feed('friends') r")).r.items as { kind: string }[]).filter((i) => i.kind === 'sponsored').length;
    expect(await feedSponsored()).toBe(0);
    await as(c(), world.admin, () => q(c(), 'select approve_boost($1, $2)', [boostId, 'approve']));
    await as(c(), world.admin, () => q(c(), "select update_setting('sponsored_feed_interval', '1')"));
    expect(await feedSponsored()).toBe(1);
    const exploreBoost = (await rpc(world.owner, "select create_boost($1, 'explore', $2, $3, $4) id", [world.offerId, world.cityId, starts, ends])).id;
    await as(c(), world.admin, () => q(c(), 'select approve_boost($1, $2)', [exploreBoost, 'approve']));
    const explore = (await rpc(viewer, 'select explore_restaurants() r')).r;
    expect(explore.sponsored).toHaveLength(1);
    expect(explore.sponsored[0].label).toBe('Sponsored');

    for (let i = 0; i < 3; i += 1) await rpc(viewer, "select record_placement_event($1, 'impression')", [boostId]);
    await rpc(viewer, "select record_placement_event($1, 'tap')", [boostId]);
    const report = (await as(c(), world.owner, () => q(c(), 'select impressions, taps from boost_report where id = $1', [boostId]))).rows[0];
    expect(report).toEqual({ impressions: 1, taps: 1 });

    await q(c(), 'select app.accrue_boost_fees()');
    await q(c(), 'select app.accrue_boost_fees()');
    expect((await q(c(), "select count(*)::int n, sum(fee_paise)::int f from fee_ledger where boost_id = $1", [boostId])).rows[0]).toEqual({ n: 1, f: 70000 });
    await rpc(world.owner, "select set_boost_state($1, 'paused')", [boostId]);
    expect(await feedSponsored()).toBe(0);

    await rpc(world.owner, "select set_boost_state($1, 'active')", [boostId]);
    await as(c(), world.admin, () => q(c(), "select update_setting('sponsored_enabled', 'false')"));
    expect(await feedSponsored()).toBe(0);
    await expectFail(rpc(world.owner, "select create_boost($1, 'feed', $2, $3, $4)", [world.offerId, world.cityId, starts, ends]), 'sponsored_disabled');
  });
});

describe('dashboard reads', () => {
  it('returns permissions, restaurants and staff to the right people only', async () => {
    const world = await buildWorld(c());
    const perms = (await rpc(world.admin, 'select my_permissions() p')).p;
    expect(perms.is_system).toBe(true);
    expect((await rpc(world.owner, 'select my_permissions() p')).p).toBeNull();
    const mine = (await rpc(world.cashier, 'select my_restaurants() r')).r;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: world.restaurantId, role: 'cashier', status: 'approved' });
    const staff = (await rpc(world.owner, 'select list_staff($1) s', [world.restaurantId])).s;
    expect(staff.members).toHaveLength(3);
    await expectFail(rpc(world.cashier, 'select list_staff($1)', [world.restaurantId]), 'not_permitted');
    await expectFail(rpc(world.cashier, 'select restaurant_recent_redemptions($1)', [world.restaurantId]), 'not_permitted');
    expect((await rpc(world.admin, 'select admin_offers($1) o', ['active'])).o.length).toBeGreaterThan(0);
    expect((await rpc(world.admin, 'select admin_restaurants($1) r', ['approved'])).r.length).toBeGreaterThan(0);
    await expectFail(rpc(world.owner, 'select admin_invoices()'), 'not_permitted');
  });
});

describe('restaurant dashboard reads', () => {
  it('calculates before saving, links an open table at lookup, and updates the agreement version on re-accept', async () => {
    const world = await buildWorld(c());
    const preview = (await rpc(world.owner, 'select calculate_redemption($1, 20, 20000, 30000, 100000) r', [world.restaurantId])).r;
    const saved = (await rpc(world.owner, 'select preview_redemption($1, $2, 100000) r', [world.restaurantId, world.offerId])).r;
    expect(preview).toEqual(saved);
    await expectFail(rpc(world.cashier, 'select calculate_redemption($1, 20, 20000, 30000, 100000)', [world.restaurantId]), 'not_permitted');

    const promoter = await customer('dash_promoter');
    const story = await postStoryAs(c(), promoter, world);
    const host = await customer('dash_host');
    await befriend(c(), promoter, host);
    await as(c(), host, () => q(c(), 'select check_in($1, 12.97, 77.59)', [world.restaurantId]));
    const visit = (await rpc(host, 'select start_group_visit($1, $2) v', [world.restaurantId, 'T9'])).v;
    const issued = (await rpc(host, 'select issue_code($1) r', [story])).r;
    const lookup = (await rpc(world.cashier, 'select lookup_code($1, $2, null) r', [world.restaurantId, issued.code.short_code])).r;
    expect(lookup.ok).toBe(true);
    expect(lookup.visit_id).toBe(visit.id);

    expect((await rpc(world.owner, 'select restaurant_alerts($1) a', [world.restaurantId])).a.flagged).toBe(0);
    expect((await rpc(world.owner, 'select restaurant_rating_trend($1) t', [world.restaurantId])).t.length).toBeGreaterThan(0);

    await as(c(), world.admin, () => q(c(), "select save_legal_draft('merchant_agreement', 'Merchant agreement v2', 'Updated agreement text')"));
    await as(c(), world.admin, () => q(c(), "select publish_legal_document('merchant_agreement')"));
    expect((await rpc(world.owner, "select pending_legal('restaurant') p")).p.map((d: { kind: string }) => d.kind)).toContain('merchant_agreement');
    await rpc(world.owner, "select accept_legal_documents('restaurant')");
    expect((await rpc(world.owner, "select pending_legal('restaurant') p")).p).toHaveLength(0);
    const latest = (await q(c(), "select max(version) v from legal_documents where kind = 'merchant_agreement' and published_at is not null")).rows[0].v;
    expect((await q(c(), 'select merchant_agreement_version v from restaurants where id = $1', [world.restaurantId])).rows[0].v).toBe(latest);
  });
});

describe('customer app reads', () => {
  it('serves a single story, wallet, restaurant page, friends and diary to the right people', async () => {
    const world = await buildWorld(c());
    const author = await customer('cust_author');
    const story = await postStoryAs(c(), author, world);
    const friend = await customer('cust_friend');
    const stranger = await customer('cust_stranger');
    await befriend(c(), author, friend);

    const card = (await rpc(friend, 'select get_story($1) s', [story])).s;
    expect(card.id).toBe(story);
    expect(card.offer.remaining).toBe(20);
    await expectFail(rpc(stranger, 'select get_story($1)', [story]), 'story_not_found');

    const issued = (await rpc(friend, 'select issue_code($1) r', [story])).r;
    const wallet = (await rpc(friend, 'select my_wallet() w')).w;
    expect(wallet.codes).toHaveLength(1);
    expect(wallet.codes[0].short_code).toBe(issued.code.short_code);
    expect(wallet.codes[0].restaurant.name).toBe('Test Kitchen');

    const page = (await rpc(friend, 'select restaurant_page($1) p', [world.restaurantId])).p;
    expect(page.restaurant.name).toBe('Test Kitchen');
    expect(page.dishes).toHaveLength(1);
    expect(page.friends.map((f: { id: string }) => f.id)).toContain(author.id);
    expect(page.offer.total_codes).toBe(20);

    expect((await rpc(friend, 'select my_friends() f')).f.friends).toHaveLength(1);
    const stats = (await rpc(author, 'select my_profile_stats() s')).s;
    expect(stats.stories).toBe(1);
    expect(stats.friends).toBe(1);

    await q(c(), "update stories set expires_at = now() - interval '1 minute' where id = $1", [story]);
    await q(c(), 'select app.expire_items()');
    expect((await rpc(friend, 'select get_feed() f')).f.items).toHaveLength(0);
    expect((await rpc(author, 'select food_diary() d')).d).toHaveLength(1);
  });
});

