import { normalisePhone } from '@datapal/core';
import * as Crypto from 'expo-crypto';

/** SHA-256 of the normalised number. Contacts are hashed on the phone and only hashes are sent. */
export async function hashPhone(raw: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalisePhone(raw), { encoding: Crypto.CryptoEncoding.HEX });
}

export function isIndianMobile(normalised: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalised);
}
