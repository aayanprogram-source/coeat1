import { credentials, json, logError, serviceClient, userClient } from '../_shared/clients.ts';
import { createPaymentLink } from '../_shared/payments.ts';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const { invoice_id } = (await req.json()) as { invoice_id: string };

  // Row level security decides whether the caller may see this invoice at all.
  const user = userClient(req);
  const { data: invoice } = await user
    .from('invoices')
    .select('id, number, status, total_paise, payment_link, restaurant_id')
    .eq('id', invoice_id)
    .maybeSingle();
  if (!invoice) return json({ error: 'not_permitted' }, 403);
  if (invoice.status === 'paid') return json({ error: 'invoice_already_paid' }, 409);
  if (invoice.payment_link) return json({ url: invoice.payment_link });

  const svc = serviceClient();
  const creds = await credentials(svc, 'payments_razorpay');
  if (!creds) return json({ error: 'integration_missing' }, 503);
  const { data: restaurant } = await svc.from('restaurants').select('name').eq('id', invoice.restaurant_id).single();

  try {
    const link = await createPaymentLink(
      { key_id: creds.public['key_id'] ?? '', key_secret: creds.secrets['key_secret'] ?? '' },
      {
        amountPaise: Number(invoice.total_paise),
        invoiceNumber: invoice.number,
        restaurantName: restaurant?.name ?? 'Restaurant',
        description: `Invoice ${invoice.number}`,
      },
    );
    await svc.rpc('set_invoice_payment_link', { p_invoice_id: invoice.id, p_url: link.url, p_link_id: link.id });
    return json({ url: link.url });
  } catch (error) {
    await logError(svc, 'create-payment-link', error instanceof Error ? error.message : 'failed', { invoice_id });
    return json({ error: 'failed' }, 502);
  }
});
