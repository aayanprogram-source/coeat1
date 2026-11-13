import { basicAuth, fetchWithRetry } from './http.ts';

export type SmsProvider = 'sms_msg91' | 'sms_twilio';

export interface SmsCredentials {
  provider: SmsProvider;
  public: Record<string, string>;
  secrets: Record<string, string>;
}

export interface SmsMessage {
  phone: string;
  otp: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  message: string;
}

export function renderOtpText(template: string, productName: string, otp: string): string {
  return template.replace('{product_name}', productName).replace('{otp}', otp);
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildMsg91Request(creds: SmsCredentials, msg: SmsMessage): { url: string; init: RequestInit } {
  return {
    url: 'https://control.msg91.com/api/v5/flow',
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', authkey: creds.secrets['auth_key'] ?? '' },
      body: JSON.stringify({
        template_id: creds.public['dlt_template_id'],
        sender: creds.public['sender_id'],
        short_url: '0',
        recipients: [{ mobiles: digitsOnly(msg.phone), OTP: msg.otp }],
      }),
    },
  };
}

export function buildTwilioRequest(creds: SmsCredentials, msg: SmsMessage): { url: string; init: RequestInit } {
  const sid = creds.public['account_sid'] ?? '';
  const form = new URLSearchParams({ To: msg.phone, From: creds.public['sender_id'] ?? '', Body: msg.text });
  return {
    url: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: basicAuth(sid, creds.secrets['auth_token'] ?? '') },
      body: form.toString(),
    },
  };
}

export async function sendSms(creds: SmsCredentials, msg: SmsMessage): Promise<SendResult> {
  const { url, init } = creds.provider === 'sms_msg91' ? buildMsg91Request(creds, msg) : buildTwilioRequest(creds, msg);
  const response = await fetchWithRetry(url, init, { retries: 1 });
  const text = await response.text();
  if (!response.ok) return { ok: false, message: `${creds.provider} responded ${response.status}: ${text.slice(0, 200)}` };
  if (creds.provider === 'sms_msg91') {
    try {
      const parsed = JSON.parse(text) as { type?: string; message?: string };
      if (parsed.type && parsed.type !== 'success') return { ok: false, message: parsed.message ?? 'MSG91 rejected the request' };
    } catch {
      return { ok: false, message: 'MSG91 returned an unreadable response' };
    }
  }
  return { ok: true, message: 'Sent' };
}
