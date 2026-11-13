import { describe, expect, it } from 'vitest';
import { emptyOffer, offerResolver, toPayload } from './offer-form-model';

const bounds = { maxDiscountPercent: 50, maxDiscountCapPaise: 50000, minBillFloorPaise: 20000, maxCodesPerOffer: 500, groupCreditCapMax: 8 };
const run = (values: ReturnType<typeof emptyOffer>) => offerResolver(bounds)(values, undefined, { fields: {}, shouldUseNativeValidation: false });

describe('offer form', () => {
  const valid = { ...emptyOffer(3, new Date('2026-12-01T10:00:00')), title: 'Welcome offer' };

  it('converts rupees to paise for the database', () => {
    const payload = toPayload(valid);
    expect(payload.discount_cap_paise).toBe(10000);
    expect(payload.min_bill_paise).toBe(30000);
    expect(payload.drop_at).toBeNull();
  });

  it('accepts values inside the platform bounds', async () => {
    expect(Object.keys((await run(valid)).errors)).toHaveLength(0);
  });

  it('rejects values outside the platform bounds, naming the field', async () => {
    const result = await run({ ...valid, discountPercent: 60, capInr: 900, totalCodes: 5000, minBillInr: 50, groupCreditCap: 20 });
    expect(Object.keys(result.errors).sort()).toEqual(['capInr', 'discountPercent', 'groupCreditCap', 'minBillInr', 'totalCodes']);
  });

  it('rejects an end before the start', async () => {
    const result = await run({ ...valid, endsAt: '2026-11-30T10:00' });
    expect(Object.keys(result.errors)).toContain('endsAt');
  });
});
