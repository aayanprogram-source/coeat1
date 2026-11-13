import { z } from 'zod';

export const appConfigSchema = z.object({
  version: z.string(),
  settings: z.record(z.string(), z.unknown()),
  flags: z.array(
    z.object({
      key: z.string(),
      is_enabled: z.boolean(),
      city_ids: z.array(z.string()),
      rollout_percent: z.number(),
    }),
  ),
  translations: z.record(z.string(), z.record(z.string(), z.string())),
  legal: z.array(
    z.object({ kind: z.string(), version: z.number(), title: z.string(), published_at: z.string() }),
  ),
  onboarding_slides: z.array(
    z.object({ id: z.string(), title: z.string(), body: z.string(), icon: z.string() }),
  ),
  faqs: z.array(
    z.object({ id: z.string(), question: z.string(), answer: z.string(), audience: z.string() }),
  ),
  cities: z.array(
    z.object({ id: z.string(), name: z.string(), state: z.string(), lat: z.number(), lng: z.number() }),
  ),
  cuisines: z.array(z.object({ id: z.string(), name: z.string() })),
  dish_categories: z.array(z.object({ id: z.string(), name: z.string() })),
  report_reasons: z.array(z.object({ id: z.string(), label: z.string() })),
  badges: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      metric: z.string(),
      threshold: z.number(),
      scope: z.string(),
      icon: z.string(),
    }),
  ),
  integrations: z.object({
    sms: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
    maps: z.boolean(),
    payments: z.boolean(),
  }),
  maps_public_keys: z.object({ mobile: z.string().nullable(), web: z.string().nullable() }),
  launch_ready: z.boolean(),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export function settingNumber(config: AppConfig, key: string): number {
  const v = config.settings[key];
  if (typeof v !== 'number') throw new Error(`Setting ${key} is not a number`);
  return v;
}

export function settingBoolean(config: AppConfig, key: string): boolean {
  const v = config.settings[key];
  if (typeof v !== 'boolean') throw new Error(`Setting ${key} is not a boolean`);
  return v;
}

export function settingString(config: AppConfig, key: string): string {
  const v = config.settings[key];
  if (typeof v !== 'string') throw new Error(`Setting ${key} is not a string`);
  return v;
}

export function flagEnabled(
  config: AppConfig,
  key: string,
  cityId: string | null,
  userId: string | null,
): boolean {
  const flag = config.flags.find((f) => f.key === key);
  if (!flag?.is_enabled) return false;
  if (flag.city_ids.length > 0 && (!cityId || !flag.city_ids.includes(cityId))) return false;
  if (flag.rollout_percent >= 100) return true;
  if (!userId) return false;
  let hash = 0;
  for (const ch of `${key}:${userId}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 100 < flag.rollout_percent;
}
