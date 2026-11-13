import { credentials, json, logError, serviceClient } from '../_shared/clients.ts';
import { verifyRazorpaySignature } from '../_shared/signatures.ts';

interface RazorpayEvent {
  event: string;
  payload?: { payment_link?: { entity?: { id?: string } } };
}

Deno.serve(async (req) => {
  const body = await req.text();
  const svc = serviceClient();
  const creds = await credentials(svc, 'payments_razorpay');
  if (!creds) return json({ error: 'not_configured' }, 503);

  const valid = await verifyRazorpaySignature(body, req.headers.get('x-razorpay-signature'), creds.secrets['webhook_secret'] ?? '');
  if (!valid) return json({ error: 'invalid_signature' }, 401);

  const eventId = req.headers.get('x-razorpay-event-id');
  const event = JSON.parse(body) as RazorpayEvent;
  const linkId = event.payload?.payment_link?.entity?.id;
  if (event.event !== 'payment_link.paid' || !eventId || !linkId) return json({ ignored: true });

  const { data, error } = await svc.rpc('record_payment_event', {
    p_event_id: eventId,
    p_payment_link_id: linkId,
    p_payload: event,
  });
  if (error) {
    await logError(svc, 'payments-webhook', error.message, { eventId });
    return json({ error: 'failed' }, 500);
  }
  return json({ applied: data === true });
});
