import nodemailer from 'npm:nodemailer@6.9.16';
import { credentials, json, logError, serviceClient, userClient } from '../_shared/clients.ts';
import { testGoogleGeocoding, testRazorpay } from '../_shared/payments.ts';
import { renderOtpText, sendSms, type SmsProvider } from '../_shared/sms.ts';

interface Request_ {
  provider: string;
  to?: string;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const user = userClient(req);
  const { data: allowed } = await user.rpc('has_platform_permission', { p_key: 'integrations.manage' });
  if (!allowed) return json({ ok: false, message: 'not_permitted' }, 403);

  const { provider, to } = (await req.json()) as Request_;
  const svc = serviceClient();
  const creds = await credentials(svc, provider);
  if (!creds) return json({ ok: false, message: 'integration_missing' }, 400);

  let result: { ok: boolean; message: string };
  try {
    if (provider === 'sms_msg91' || provider === 'sms_twilio') {
      if (!to) return json({ ok: false, message: 'A phone number is required' }, 400);
      const otp = '000000';
      result = await sendSms(
        { provider: provider as SmsProvider, public: creds.public, secrets: creds.secrets },
        { phone: to, otp, text: renderOtpText('{otp} is a test message from {product_name}.', 'Platform', otp) },
      );
    } else if (provider === 'email_smtp') {
      if (!to) return json({ ok: false, message: 'An email address is required' }, 400);
      const transport = nodemailer.createTransport({
        host: creds.public['host'],
        port: Number(creds.public['port']),
        secure: Number(creds.public['port']) === 465,
        auth: { user: creds.public['username'], pass: creds.secrets['password'] },
        connectionTimeout: 10000,
      });
      await transport.sendMail({
        from: `"${creds.public['from_name']}" <${creds.public['from_email']}>`,
        to,
        subject: 'Email test',
        text: 'Your email integration is working.',
      });
      result = { ok: true, message: 'Sent' };
    } else if (provider === 'maps_google') {
      result = await testGoogleGeocoding(creds.secrets['server_key'] ?? '');
    } else if (provider === 'payments_razorpay') {
      result = await testRazorpay({ key_id: creds.public['key_id'] ?? '', key_secret: creds.secrets['key_secret'] ?? '' });
    } else {
      return json({ ok: false, message: 'This provider cannot be tested' }, 400);
    }
  } catch (error) {
    result = { ok: false, message: error instanceof Error ? error.message : 'Test failed' };
  }

  await svc.rpc('record_integration_test', { p_provider: provider, p_ok: result.ok, p_message: result.message });
  if (!result.ok) await logError(svc, 'integration-test', result.message, { provider });
  return json(result);
});
