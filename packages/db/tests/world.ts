import type pg from 'pg';
import { as, createSuperadmin, createUser, type Actor } from './helpers';

export interface World {
  admin: Actor;
  cityId: string;
  owner: Actor;
  manager: Actor;
  cashier: Actor;
  restaurantId: string;
  itemId: string;
  offerId: string;
}

export const q = (client: pg.Client, sql: string, params: unknown[] = []) => client.query(sql, params);

export async function befriend(client: pg.Client, a: Actor, b: Actor): Promise<void> {
  await as(client, a, () => q(client, 'select send_friend_request($1)', [b.id]));
  const { rows } = await q(client, 'select id from friendships where requester_id = $1 and addressee_id = $2', [a.id, b.id]);
  await as(client, b, () => q(client, 'select respond_friend_request($1, true)', [rows[0].id]));
}

export async function createCustomer(client: pg.Client, n: number, handle: string): Promise<Actor> {
  const id = await createUser(client, `+9198000${String(n).padStart(5, '0')}`);
  await q(client, "update profiles set name = $2, handle = $3, age_confirmed = true, onboarding_done = true where id = $1", [id, `Customer ${n}`, handle]);
  return { id };
}

export async function publishLegal(client: pg.Client, admin: Actor): Promise<void> {
  for (const kind of ['terms', 'privacy', 'merchant_agreement', 'rewards_policy', 'community_guidelines']) {
    await as(client, admin, () => q(client, 'select save_legal_draft($1, $2, $3)', [kind, kind, `Body text for ${kind}`]));
    await as(client, admin, () => q(client, 'select publish_legal_document($1)', [kind]));
  }
}

export async function buildWorld(client: pg.Client, offerOverrides: Record<string, unknown> = {}): Promise<World> {
  const admin = await createSuperadmin(client);
  await publishLegal(client, admin);
  const city = (await as(client, admin, () => q(client, "select admin_save('city', null, $1::jsonb) r", [JSON.stringify({ name: `City ${Math.random()}`, state: 'KA', lat: 12.97, lng: 77.59 })]))).rows[0].r;
  if ((await q(client, 'select 1 from cuisines limit 1')).rowCount === 0) {
    await as(client, admin, () => q(client, "select admin_save('cuisine', null, '{\"name\":\"North Indian\"}'::jsonb)"));
  }
  const cuisineId = (await q(client, 'select id from cuisines limit 1')).rows[0].id;

  const owner: Actor = { id: await createUser(client) };
  const details = {
    name: 'Test Kitchen', city_id: city.id, cuisine_ids: [cuisineId], address: '12 Main Road, Bengaluru',
    lat: 12.97, lng: 77.59, phone: '+919800099999', hours: { mon: [{ open: '10:00', close: '23:00' }] }, upi_id: '',
  };
  const restaurantId = (await as(client, owner, () => q(client, 'select create_restaurant($1::jsonb) id', [JSON.stringify(details)]))).rows[0].id as string;
  await as(client, owner, () => q(client, "select update_restaurant($1, '{\"logo_path\":\"logo.jpg\",\"cover_path\":\"cover.jpg\"}'::jsonb)", [restaurantId]));
  const catId = (await as(client, owner, () => q(client, "select save_menu_category($1, null, 'Mains', 0) id", [restaurantId]))).rows[0].id;
  const itemId = (await as(client, owner, () => q(client, 'select save_menu_item($1, null, $2::jsonb) id', [restaurantId, JSON.stringify({ category_id: catId, dish_category_id: null, name: 'Butter Chicken', price_paise: 45000, is_veg: false, is_available: true })]))).rows[0].id as string;
  await as(client, owner, () => q(client, 'select accept_merchant_agreement($1)', [restaurantId]));
  await as(client, owner, () => q(client, 'select submit_restaurant($1)', [restaurantId]));
  await as(client, admin, () => q(client, "select review_restaurant($1, 'approve')", [restaurantId]));

  const manager: Actor = { id: await createUser(client) };
  const cashier: Actor = { id: await createUser(client) };
  await q(client, "update auth.users set email = 'manager@test.invalid' where id = $1", [manager.id]);
  await q(client, "update auth.users set email = 'cashier@test.invalid' where id = $1", [cashier.id]);
  await as(client, owner, () => q(client, "select invite_staff($1, 'manager@test.invalid', 'manager')", [restaurantId]));
  await as(client, owner, () => q(client, "select invite_staff($1, 'cashier@test.invalid', 'cashier')", [restaurantId]));
  await as(client, manager, () => q(client, 'select claim_staff_invites()'));
  await as(client, cashier, () => q(client, 'select claim_staff_invites()'));

  const offer = {
    title: 'Welcome offer', discount_percent: 20, discount_cap_paise: 20000, min_bill_paise: 30000, total_codes: 20,
    starts_at: new Date(Date.now() - 3600_000).toISOString(), ends_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    drop_at: null, active_hours: [], group_credit_cap: 3, ...offerOverrides,
  };
  const offerId = (await as(client, owner, () => q(client, 'select save_offer($1, null, $2::jsonb) id', [restaurantId, JSON.stringify(offer)]))).rows[0].id as string;
  await as(client, owner, () => q(client, 'select submit_offer($1)', [offerId]));
  await as(client, admin, () => q(client, "select review_offer($1, 'approve')", [offerId]));

  return { admin, cityId: city.id as string, owner, manager, cashier, restaurantId, itemId, offerId };
}

export async function postStoryAs(client: pg.Client, author: Actor, w: World): Promise<string> {
  const checkin = (await as(client, author, () => q(client, 'select check_in($1, 12.97, 77.59) c', [w.restaurantId]))).rows[0].c;
  return (await as(client, author, () => q(client, 'select post_story($1, $2, $3, $4::jsonb) id', [
    checkin.id, 'photo.jpg', 'Great meal', JSON.stringify([{ menu_item_id: w.itemId, rating: 5 }]),
  ]))).rows[0].id as string;
}
