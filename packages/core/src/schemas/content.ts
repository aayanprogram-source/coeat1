import { z } from 'zod';
import { handle, latitude, longitude, uuid } from './common';

export const profileSchema = z.object({ name: z.string().trim().min(2).max(50), handle });

export const checkInSchema = z.object({ restaurant_id: uuid, lat: latitude, lng: longitude });

export const dishRatingSchema = z.object({ menu_item_id: uuid, rating: z.number().int().min(1).max(5) });

export const postStorySchema = z.object({
  checkin_id: uuid,
  photo_path: z.string().min(1).max(300),
  caption: z.string().trim().max(280),
  dishes: z.array(dishRatingSchema).min(1).max(10),
});
export type PostStoryInput = z.infer<typeof postStorySchema>;

export const reportSchema = z.object({
  story_id: uuid,
  reason_id: uuid,
  note: z.string().trim().max(300),
});

export const pollSchema = z.object({
  question: z.string().trim().min(3).max(120),
  restaurant_ids: z.array(uuid).min(2).max(4),
});
