import { z } from 'zod';
import { locale, uuid } from './common';
import { permissionKeys } from '../permissions';

export const legalDocumentKinds = [
  'terms',
  'privacy',
  'merchant_agreement',
  'rewards_policy',
  'community_guidelines',
] as const;
export type LegalDocumentKind = (typeof legalDocumentKinds)[number];

export const legalDocumentSchema = z.object({
  kind: z.enum(legalDocumentKinds),
  title: z.string().trim().min(2).max(120),
  body: z.string().min(10).max(200000),
});

export const onboardingSlideSchema = z.object({
  title: z.string().trim().min(2).max(60),
  body: z.string().trim().min(2).max(240),
  icon: z.string().min(1).max(40),
  sort_order: z.number().int().min(0).max(99),
  is_published: z.boolean(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(5000),
  audience: z.enum(['customer', 'restaurant']),
  sort_order: z.number().int().min(0).max(999),
  is_published: z.boolean(),
});

export const translationSchema = z.object({
  key: z.string().min(1).max(120),
  locale,
  value: z.string().max(2000),
});

export const notificationEvents = [
  'friend_redeemed',
  'reward_unlocked',
  'code_ending_soon',
  'new_drop',
  'staff_invite',
  'invoice_issued',
  'boost_approved',
  'legal_update',
  'campaign',
] as const;
export type NotificationEvent = (typeof notificationEvents)[number];

export const notificationTemplateSchema = z.object({
  event: z.enum(notificationEvents),
  locale,
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(240),
  is_enabled: z.boolean(),
});

export const badgeMetrics = [
  'stories_posted',
  'friends_redeemed',
  'restaurants_visited',
  'verified_ratings',
] as const;
export const badgeIcons = [
  'award',
  'star',
  'flame',
  'crown',
  'heart',
  'medal',
  'sparkles',
  'trophy',
  'utensils',
  'map-pin',
] as const;
export const badgeDefinitionSchema = z.object({
  name: z.string().trim().min(2).max(40),
  metric: z.enum(badgeMetrics),
  threshold: z.number().int().min(1).max(100000),
  scope: z.enum(['global', 'restaurant']),
  icon: z.enum(badgeIcons),
  is_active: z.boolean(),
});

export const citySchema = z.object({
  name: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_active: z.boolean(),
  sponsored_enabled: z.boolean(),
  sponsored_price_per_day_paise: z.number().int().min(0).nullable(),
});
export const cuisineSchema = z.object({ name: z.string().trim().min(2).max(40), is_active: z.boolean() });
export const dishCategorySchema = z.object({ name: z.string().trim().min(2).max(40), is_active: z.boolean() });
export const reportReasonSchema = z.object({
  label: z.string().trim().min(2).max(60),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(99),
});
export const featureFlagSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .max(60),
  description: z.string().max(200),
  is_enabled: z.boolean(),
  city_ids: z.array(uuid),
  rollout_percent: z.number().int().min(0).max(100),
});

export const adminRoleSchema = z.object({
  name: z.string().trim().min(2).max(40),
  permissions: z.array(z.enum(permissionKeys)),
});
export const adminInviteSchema = z.object({ email: z.string().email(), role_id: uuid });

export const campaignSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(240),
  city_id: uuid.nullable(),
  active_within_days: z.number().int().min(1).max(365).nullable(),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
});

export const breachSchema = z.object({
  summary: z.string().trim().min(5).max(500),
  detected_at: z.string().datetime({ offset: true }),
  affected_count: z.number().int().min(0),
  notified_authority_at: z.string().datetime({ offset: true }).nullable(),
  notes: z.string().max(5000),
});
