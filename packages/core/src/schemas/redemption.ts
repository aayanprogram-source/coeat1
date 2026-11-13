import { z } from 'zod';
import { paise, shortCode, uuid } from './common';

export const redeemInputSchema = z
  .object({
    restaurant_id: uuid,
    short_code: shortCode.optional(),
    code_id: uuid.optional(),
    bill_paise: paise.min(1),
    idempotency_key: z.string().min(8).max(80),
    bill_photo_path: z.string().max(300).nullable(),
  })
  .refine((v) => v.short_code !== undefined || v.code_id !== undefined, {
    message: 'Code is required',
    path: ['short_code'],
  });
export type RedeemInput = z.infer<typeof redeemInputSchema>;

export const reverseInputSchema = z.object({
  redemption_id: uuid,
  reason: z.string().trim().min(5).max(300),
});
