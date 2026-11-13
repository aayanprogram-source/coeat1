import { describe, expect, it } from 'vitest';
import { emptyDraft, isCheckinLive } from './draft';

describe('draft check-in', () => {
  it('is live only before the check-in window ends', () => {
    const draft = { ...emptyDraft, checkinId: 'c1', checkinExpiresAt: '2026-12-01T10:00:00Z' };
    expect(isCheckinLive(draft, Date.parse('2026-12-01T09:59:00Z'))).toBe(true);
    expect(isCheckinLive(draft, Date.parse('2026-12-01T10:01:00Z'))).toBe(false);
  });

  it('is not live without a check-in', () => {
    expect(isCheckinLive(emptyDraft, 0)).toBe(false);
  });
});
