import { describe, expect, it } from 'vitest';
import { groupOf, type WalletCode } from './types';

const base = { id: '1', short_code: '1234', redeemed_at: null, restaurant: { id: 'r', name: 'R', logo_path: null } } as unknown as Omit<WalletCode, 'status' | 'expires_at'>;
const now = Date.parse('2026-12-01T12:00:00Z');

describe('wallet grouping', () => {
  it('puts live issued codes under Active, redeemed under Used, everything else under Expired', () => {
    expect(groupOf({ ...base, status: 'issued', expires_at: '2026-12-02T00:00:00Z' }, now)).toBe('active');
    expect(groupOf({ ...base, status: 'issued', expires_at: '2026-11-30T00:00:00Z' }, now)).toBe('expired');
    expect(groupOf({ ...base, status: 'redeemed', expires_at: '2026-11-30T00:00:00Z' }, now)).toBe('used');
    expect(groupOf({ ...base, status: 'void', expires_at: '2026-12-02T00:00:00Z' }, now)).toBe('expired');
  });
});
