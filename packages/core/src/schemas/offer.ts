import { z } from 'zod';
import { activeHours, isoDate, paise, percent } from './common';

export interface OfferBounds {
  maxDiscountPercent: number;
  maxDiscountCapPaise: number;
  minBillFloorPaise: number;
  maxCodesPerOffer: number;
  groupCreditCapMax: number;
}

export const offerInputSchema = z.object({
  title: z.string().trim().min(3).max(60),
  discount_percent: percent.min(1),
  discount_cap_paise: paise.min(100),
  min_bill_paise: paise,
  total_codes: z.number().int().min(1),
  starts_at: isoDate,
  ends_at: isoDate,
  drop_at: isoDate.nullable(),
  active_hours: activeHours,
  group_credit_cap: z.number().int().min(1),
});
export type OfferInput = z.infer<typeof offerInputSchema>;

export function offerSchemaWithin(bounds: OfferBounds) {
  return offerInputSchema
    .extend({
      discount_percent: percent.min(1).max(bounds.maxDiscountPercent),
      discount_cap_paise: paise.min(100).max(bounds.maxDiscountCapPaise),
      min_bill_paise: paise.min(bounds.minBillFloorPaise),
      total_codes: z.number().int().min(1).max(bounds.maxCodesPerOffer),
      group_credit_cap: z.number().int().min(1).max(bounds.groupCreditCapMax),
    })
    .refine((o) => new Date(o.ends_at) > new Date(o.starts_at), {
      message: 'End must be after start',
      path: ['ends_at'],
    })
    .refine((o) => !o.drop_at || new Date(o.drop_at) < new Date(o.ends_at), {
      message: 'Drop must be before end',
      path: ['drop_at'],
    });
}
