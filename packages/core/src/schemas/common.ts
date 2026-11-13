import { z } from 'zod';

export const uuid = z.string().uuid();
export const paise = z.number().int().min(0);
export const percent = z.number().int().min(0).max(100);
export const isoDate = z.string().datetime({ offset: true });
export const phone = z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian mobile number');
export const handle = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/, 'Lowercase letters, digits and underscore only');
export const shortCode = z.string().regex(/^\d{4}$/, 'Enter the 4-digit code');
export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);
export const locale = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);
export const email = z.string().email().max(254);
export const password = z.string().min(10).max(128);
const clock = z.string().regex(/^\d{2}:\d{2}$/);

export const dayHours = z.object({ open: clock, close: clock });
export const weeklyHours = z.record(
  z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  z.array(dayHours).max(3),
);
export type WeeklyHours = z.infer<typeof weeklyHours>;

export const activeHours = z
  .array(z.object({ day: z.number().int().min(0).max(6), from: clock, to: clock }))
  .max(21);
export type ActiveHours = z.infer<typeof activeHours>;
