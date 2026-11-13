import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMessages, chunk, isDeadToken } from '../supabase/functions/_shared/expo.ts';
import { fetchWithRetry } from '../supabase/functions/_shared/http.ts';
import { buildPaymentLinkBody } from '../supabase/functions/_shared/payments.ts';
import { verifyRazorpaySignature, verifyStandardWebhook } from '../supabase/functions/_shared/signatures.ts';
import {
  buildMsg91Request,
  buildTwilioRequest,
  renderOtpText,
  type SmsCredentials,
} from '../supabase/functions/_shared/sms.ts';

const secretBytes = Buffer.from('super-secret-key-material');
const hookSecret = `v1,whsec_${secretBytes.toString('base64')}`;
const sign = (id: string, ts: string, body: string) =>
  `v1,${createHmac('sha256', secretBytes).update(`${id}.${ts}.${body}`).digest('base64')}`;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('standard webhook signatures', () => {
  const now = 1_800_000_000;
  const body = '{"user":{"phone":"+919800000000"},"sms":{"otp":"123456"}}';

  it('accepts a valid signature and rejects tampering, staleness and missing headers', async () => {
    const headers = { id: 'msg_1', timestamp: String(now), signature: sign('msg_1', String(now), body) };
    expect(await verifyStandardWebhook(hookSecret, headers, body, now)).toBe(true);
    expect(await verifyStandardWebhook(hookSecret, headers, `${body} `, now)).toBe(false);
    expect(await verifyStandardWebhook(hookSecret, headers, body, now + 1000)).toBe(false);
    expect(await verifyStandardWebhook(hookSecret, { ...headers, signature: null }, body, now)).toBe(false);
  });

  it('accepts any signature in a space-separated list', async () => {
    const good = sign('msg_2', String(now), body);
    const headers = { id: 'msg_2', timestamp: String(now), signature: `v1,AAAA ${good}` };
    expect(await verifyStandardWebhook(hookSecret, headers, body, now)).toBe(true);
  });
});

describe('razorpay signatures', () => {
  it('verifies the hex HMAC of the raw body', async () => {
    const body = '{"event":"payment_link.paid"}';
    const good = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(await verifyRazorpaySignature(body, good, 'whsec')).toBe(true);
    expect(await verifyRazorpaySignature(body, good.replace(/.$/, '0'), 'whsec')).toBe(false);
    expect(await verifyRazorpaySignature(body, null, 'whsec')).toBe(false);
  });
});

describe('sms providers', () => {
  const msg91: SmsCredentials = {
    provider: 'sms_msg91',
    public: { sender_id: 'SENDER', dlt_template_id: 'T1', dlt_entity_id: 'E1' },
    secrets: { auth_key: 'k' },
  };
  const twilio: SmsCredentials = {
    provider: 'sms_twilio',
    public: { account_sid: 'AC1', sender_id: '+15550001111' },
    secrets: { auth_token: 'tok' },
  };

  it('builds an MSG91 flow request with digits-only numbers', () => {
    const { url, init } = buildMsg91Request(msg91, { phone: '+919800000000', otp: '123456', text: '' });
    expect(url).toBe('https://control.msg91.com/api/v5/flow');
    const parsed = JSON.parse(typeof init.body === 'string' ? init.body : '') as { recipients: unknown[] };
    expect(parsed.recipients[0]).toEqual({ mobiles: '919800000000', OTP: '123456' });
    expect((init.headers as Record<string, string>)['authkey']).toBe('k');
  });

  it('builds a Twilio request with basic auth and form body', () => {
    const { url, init } = buildTwilioRequest(twilio, { phone: '+919800000000', otp: '1', text: 'Hi 1' });
    expect(url).toContain('/Accounts/AC1/Messages.json');
    expect(typeof init.body === 'string' ? init.body : '').toContain('Body=Hi+1');
    const auth = (init.headers as Record<string, string>)['authorization'];
    expect(auth).toBe(`Basic ${Buffer.from('AC1:tok').toString('base64')}`);
  });

  it('renders the editable OTP template', () => {
    expect(renderOtpText('{otp} is your {product_name} code', 'Acme', '424242')).toBe('424242 is your Acme code');
  });
});

describe('push helpers', () => {
  it('expands one message per token and splits title from body', () => {
    const { messages, owners } = buildMessages([{ id: 'a', detail: 'Title\nBody line', tokens: ['t1', 't2'] }]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ to: 't1', title: 'Title', body: 'Body line' });
    expect(owners).toEqual(['a', 'a']);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(isDeadToken('DeviceNotRegistered')).toBe(true);
    expect(isDeadToken('MessageTooBig')).toBe(false);
  });
});

describe('payment link body', () => {
  it('uses paise, the invoice number as reference and sends no notifications', () => {
    const body = buildPaymentLinkBody({
      amountPaise: 118000,
      invoiceNumber: 'INV-000001',
      restaurantName: 'Test',
      description: 'Invoice',
    });
    expect(body).toMatchObject({ amount: 118000, currency: 'INR', reference_id: 'INV-000001', accept_partial: false });
  });
});

describe('fetchWithRetry', () => {
  it('retries server errors with backoff and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await fetchWithRetry('https://example.test', {}, { retries: 2, backoffMs: 1 });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors and gives up after the last retry', async () => {
    const clientError = vi.fn().mockResolvedValue(new Response('no', { status: 400 }));
    vi.stubGlobal('fetch', clientError);
    expect((await fetchWithRetry('https://example.test', {}, { retries: 3, backoffMs: 1 })).status).toBe(400);
    expect(clientError).toHaveBeenCalledTimes(1);
    const failing = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', failing);
    await expect(fetchWithRetry('https://example.test', {}, { retries: 1, backoffMs: 1 })).rejects.toThrow('network');
    expect(failing).toHaveBeenCalledTimes(2);
  });
});
