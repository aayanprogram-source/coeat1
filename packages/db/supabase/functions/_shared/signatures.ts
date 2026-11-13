const encoder = new TextEncoder();

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies a Standard Webhooks signature, which is what Supabase Auth uses for hooks.
 * The secret looks like "v1,whsec_<base64>".
 */
export async function verifyStandardWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const rawSecret = secret.replace(/^v1,/, '').replace(/^whsec_/, '');
  const expected = toBase64(await hmacSha256(fromBase64(rawSecret), `${headers.id}.${headers.timestamp}.${body}`));
  return headers.signature
    .split(' ')
    .map((part) => part.replace(/^v1,/, ''))
    .some((candidate) => safeEqual(candidate, expected));
}

/** Razorpay signs the raw body with the webhook secret and sends the hex digest. */
export async function verifyRazorpaySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const expected = toHex(await hmacSha256(encoder.encode(secret), body));
  return safeEqual(signature, expected);
}
