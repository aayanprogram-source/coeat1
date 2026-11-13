import { z } from 'zod';
import { latitude, longitude, paise, phone, uuid, weeklyHours } from './common';

export const restaurantDetailsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city_id: uuid,
  cuisine_ids: z.array(uuid).min(1).max(5),
  address: z.string().trim().min(5).max(300),
  lat: latitude,
  lng: longitude,
  phone,
  hours: weeklyHours,
  upi_id: z.union([z.string().trim().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/), z.literal('')]),
});
export type RestaurantDetails = z.infer<typeof restaurantDetailsSchema>;

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  sort_order: z.number().int().min(0).max(999),
});

export const menuItemSchema = z.object({
  category_id: uuid,
  dish_category_id: uuid.nullable(),
  name: z.string().trim().min(1).max(80),
  price_paise: paise.max(10_000_000),
  is_veg: z.boolean(),
  is_available: z.boolean(),
});
export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuCsvRowSchema = z.object({
  category: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  price: z.coerce.number().min(0).max(100000),
  veg: z
    .enum(['yes', 'no', 'true', 'false', 'y', 'n'])
    .transform((v) => ['yes', 'true', 'y'].includes(v)),
});

export const rewardLevelSchema = z.object({
  friends_required: z.number().int().min(1).max(100),
  type: z.enum(['percent_off', 'free_item', 'free_meal']),
  value: z.number().int().min(0),
  label: z.string().trim().min(1).max(60),
});
export type RewardLevelInput = z.infer<typeof rewardLevelSchema>;

export const staffInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['manager', 'cashier']),
});
