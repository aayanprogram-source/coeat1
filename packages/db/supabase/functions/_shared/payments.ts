import { basicAuth, fetchWithRetry } from './http.ts';

export interface RazorpayCredentials {
  key_id: string;
  key_secret: string;
}

export interface PaymentLinkInput {
  amountPaise: number;
  invoiceNumber: string;
  restaurantName: string;
  description: string;
}

export function buildPaymentLinkBody(input: PaymentLinkInput): Record<string, unknown> {
  return {
    amount: input.amountPaise,
    currency: 'INR',
    accept_partial: false,
    reference_id: input.invoiceNumber,
    description: input.description,
    customer: { name: input.restaurantName },
    notify: { sms: false, email: false },
    reminder_enable: false,
  };
}

export async function createPaymentLink(
  creds: RazorpayCredentials,
  input: PaymentLinkInput,
): Promise<{ id: string; url: string }> {
  const response = await fetchWithRetry('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: basicAuth(creds.key_id, creds.key_secret) },
    body: JSON.stringify(buildPaymentLinkBody(input)),
  });
  if (!response.ok) throw new Error(`Razorpay responded ${response.status}`);
  const parsed = (await response.json()) as { id: string; short_url: string };
  return { id: parsed.id, url: parsed.short_url };
}

export async function testRazorpay(creds: RazorpayCredentials): Promise<{ ok: boolean; message: string }> {
  const response = await fetchWithRetry('https://api.razorpay.com/v1/payment_links?count=1', {
    method: 'GET',
    headers: { authorization: basicAuth(creds.key_id, creds.key_secret) },
  });
  return response.ok
    ? { ok: true, message: 'Credentials accepted' }
    : { ok: false, message: `Razorpay responded ${response.status}` };
}

export async function testGoogleGeocoding(serverKey: string): Promise<{ ok: boolean; message: string }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent('Bengaluru')}&key=${encodeURIComponent(serverKey)}`;
  const response = await fetchWithRetry(url, { method: 'GET' });
  if (!response.ok) return { ok: false, message: `Google responded ${response.status}` };
  const parsed = (await response.json()) as { status: string; error_message?: string };
  return parsed.status === 'OK'
    ? { ok: true, message: 'Geocoding works' }
    : { ok: false, message: parsed.error_message ?? parsed.status };
}
