import type { OfferCard } from '@datapal/core';

export interface WalletCode {
  id: string;
  short_code: string;
  status: 'issued' | 'redeemed' | 'expired' | 'void';
  expires_at: string;
  redeemed_at: string | null;
  restaurant: { id: string; name: string; logo_path: string | null };
  offer: OfferCard;
}

export interface WalletReward {
  id: string;
  status: 'locked' | 'available' | 'used' | 'expired';
  claimed_at: string | null;
  label: string;
  type: string;
  value: number;
  restaurant: { id: string; name: string };
}

export interface WalletProgress {
  restaurant_id: string;
  name: string;
  released: number;
  held: number;
  levels: { friends_required: number; label: string; type: string; value: number }[];
}

export interface Wallet {
  codes: WalletCode[];
  rewards: WalletReward[];
  progress: WalletProgress[];
}

export type CodeGroup = 'active' | 'used' | 'expired';

export function groupOf(code: WalletCode, now: number): CodeGroup {
  if (code.status === 'redeemed') return 'used';
  if (code.status === 'issued' && new Date(code.expires_at).getTime() > now) return 'active';
  return 'expired';
}
