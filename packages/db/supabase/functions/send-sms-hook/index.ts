import { credentials, json, logError, requireEnv, serviceClient, settingValue } from '../_shared/clients.ts';
import { renderOtpText, sendSms, type SmsProvider } from '../_shared/sms.ts';
import { verifyStandardWebhook } from '../_shared/signatures.ts';

interface HookPayload {
  user: { phone: string };
  sms: { otp: string };
}

function hookError(status: number, message: string): Response {
  return json({ error: { http_code: status, message } }, status);
}

Deno.serve(async (req) => {
  const body = await req.text();
  const valid = await verifyStandardWebhook(
    requireEnv('SEND_SMS_HOOK_SECRET'),
    {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
    body,
  );
  if (!valid) return hookError(401, 'invalid_signature');

  const payload = JSON.parse(body) as HookPayload;
  const svc = serviceClient();
  const { data: provider } = await svc.rpc('active_sms_provider');
  if (!provider) return hookError(503, 'sms_unavailable');

  const creds = await credentials(svc, provider as string);
  if (!creds) return hookError(503, 'sms_unavailable');

  const productName = await settingValue(svc, 'product_name');
  const template = await settingValue(svc, 'sms_otp_message');
  const phone = payload.user.phone.startsWith('+') ? payload.user.phone : `+${payload.user.phone}`;

  try {
    const result = await sendSms(
      { provider: provider as SmsProvider, public: creds.public, secrets: creds.secrets },
      { phone, otp: payload.sms.otp, text: renderOtpText(template, productName, payload.sms.otp) },
    );
    if (!result.ok) {
      await logError(svc, 'send-sms-hook', result.message, { provider });
      return hookError(502, 'sms_failed');
    }
    return json({});
  } catch (error) {
    await logError(svc, 'send-sms-hook', error instanceof Error ? error.message : 'unknown', { provider });
    return hookError(502, 'sms_failed');
  }
});
