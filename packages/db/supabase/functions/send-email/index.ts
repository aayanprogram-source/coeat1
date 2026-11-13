import nodemailer from 'npm:nodemailer@6.9.16';
import { credentials, json, logError, serviceClient, settingValue, userClient } from '../_shared/clients.ts';

type Kind = 'restaurant_invite' | 'admin_invite' | 'invoice';
interface Body {
  kind: Kind;
  id: string;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const { kind, id } = (await req.json()) as Body;
  const user = userClient(req);
  const svc = serviceClient();
  const product = await settingValue(svc, 'product_name');

  let to = '';
  let subject = '';
  let text = '';

  // Each branch reads through the caller's own client, so row level security proves they may send it.
  if (kind === 'restaurant_invite') {
    const { data } = await user.from('restaurant_invites').select('email, role, restaurant_id').eq('id', id).maybeSingle();
    if (!data) return json({ error: 'not_permitted' }, 403);
    const { data: r } = await svc.from('restaurants').select('name').eq('id', data.restaurant_id).single();
    to = data.email;
    subject = `You have been invited to ${r?.name ?? 'a restaurant'} on ${product}`;
    text = `You were invited as ${data.role}. Sign up or sign in with this email address to accept.`;
  } else if (kind === 'admin_invite') {
    const { data } = await user.from('admin_invites').select('email').eq('id', id).maybeSingle();
    if (!data) return json({ error: 'not_permitted' }, 403);
    to = data.email;
    subject = `You have been invited to the ${product} team`;
    text = 'Sign up or sign in with this email address to accept, then set up two-factor authentication.';
  } else {
    const { data } = await user.from('invoices').select('number, total_paise, due_at, restaurant_id').eq('id', id).maybeSingle();
    if (!data) return json({ error: 'not_permitted' }, 403);
    const { data: owner } = await svc.from('restaurant_staff').select('user_id').eq('restaurant_id', data.restaurant_id).eq('role', 'owner').single();
    const { data: authUser } = await svc.auth.admin.getUserById(owner?.user_id ?? '');
    to = authUser.user?.email ?? '';
    subject = `Invoice ${data.number} from ${product}`;
    text = `Invoice ${data.number} for ₹${(Number(data.total_paise) / 100).toFixed(2)} is due on ${new Date(data.due_at).toDateString()}. Open your dashboard to view and pay it.`;
  }
  if (!to) return json({ error: 'no_recipient' }, 400);

  const creds = await credentials(svc, 'email_smtp');
  if (!creds) return json({ error: 'integration_missing' }, 503);
  try {
    const transport = nodemailer.createTransport({
      host: creds.public['host'],
      port: Number(creds.public['port']),
      secure: Number(creds.public['port']) === 465,
      auth: { user: creds.public['username'], pass: creds.secrets['password'] },
      connectionTimeout: 10000,
    });
    await transport.sendMail({ from: `"${creds.public['from_name']}" <${creds.public['from_email']}>`, to, subject, text });
    return json({ sent: true });
  } catch (error) {
    await logError(svc, 'send-email', error instanceof Error ? error.message : 'failed', { kind });
    return json({ error: 'failed' }, 502);
  }
});
