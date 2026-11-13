import { credentials, json, logError, serviceClient } from '../_shared/clients.ts';
import {
  buildMessages,
  chunk,
  fetchExpoReceipts,
  isDeadToken,
  sendExpoBatch,
  type PushItem,
} from '../_shared/expo.ts';

// Scheduled every minute from Supabase Cron. Sends queued pushes, then processes receipts and prunes dead tokens.
Deno.serve(async () => {
  const svc = serviceClient();
  const creds = await credentials(svc, 'push_expo');
  if (!creds) return json({ sent: 0, skipped: 'push_not_configured' });
  const accessToken = creds.secrets['access_token'] ?? '';

  const { data: batch } = await svc.rpc('push_batch', { p_limit: 200 });
  const items = (batch ?? []) as PushItem[];
  const { messages, owners } = buildMessages(items);

  let sent = 0;
  const tickets: { ticket_id: string; token: string }[] = [];
  let offset = 0;
  for (const part of chunk(messages, 100)) {
    try {
      const results = await sendExpoBatch(accessToken, part);
      results.forEach((ticket, i) => {
        const message = part[i];
        if (!message) return;
        if (ticket.status === 'ok' && ticket.id) {
          tickets.push({ ticket_id: ticket.id, token: message.to });
          sent += 1;
        } else if (isDeadToken(ticket.details?.error)) {
          void svc.rpc('push_remove_token', { p_token: message.to });
        }
      });
    } catch (error) {
      const failedOwners = new Set(owners.slice(offset, offset + part.length));
      for (const id of failedOwners) {
        await svc.rpc('push_mark_failed', { p_log_id: id, p_message: error instanceof Error ? error.message : 'send failed' });
      }
      await logError(svc, 'deliver-push', error instanceof Error ? error.message : 'send failed', null);
    }
    offset += part.length;
  }
  if (tickets.length > 0) await svc.rpc('push_save_tickets', { p_tickets: tickets });

  const { data: pending } = await svc.rpc('push_pending_receipts', { p_limit: 300 });
  const due = (pending ?? []) as { ticket_id: string; token: string }[];
  let removed = 0;
  for (const part of chunk(due, 100)) {
    try {
      const receipts = await fetchExpoReceipts(accessToken, part.map((t) => t.ticket_id));
      for (const t of part) {
        const receipt = receipts[t.ticket_id];
        if (receipt?.status === 'error' && isDeadToken(receipt.details?.error)) {
          await svc.rpc('push_remove_token', { p_token: t.token });
          removed += 1;
        }
      }
    } catch (error) {
      await logError(svc, 'deliver-push', error instanceof Error ? error.message : 'receipts failed', null);
    }
  }
  return json({ sent, removed });
});
