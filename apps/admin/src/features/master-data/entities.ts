import {
  badgeDefinitionSchema,
  badgeIcons,
  badgeMetrics,
  breachSchema,
  citySchema,
  cuisineSchema,
  dishCategorySchema,
  faqSchema,
  featureFlagSchema,
  notificationEvents,
  notificationTemplateSchema,
  onboardingSlideSchema,
  reportReasonSchema,
} from '@datapal/core';
import type { FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';
import type { EntityConfig } from '@/components/entity-manager';

const options = (values: readonly string[]) => values.map((v) => ({ value: v, label: v.replaceAll('_', ' ') }));
const schema = (s: unknown) => s as ZodType<FieldValues>;

export const cityEntity: EntityConfig = {
  entity: 'city',
  table: 'cities',
  pk: 'id',
  title: 'sa.master.cities',
  empty: 'sa.master.cities_empty',
  order: 'name',
  columns: [
    { key: 'name', label: 'common.name' },
    { key: 'state', label: 'sa.master.state' },
    { key: 'is_active', label: 'sa.master.active', kind: 'bool' },
    { key: 'sponsored_enabled', label: 'sa.master.sponsored_on', kind: 'bool' },
  ],
  fields: [
    { name: 'name', label: 'common.name', type: 'text' },
    { name: 'state', label: 'sa.master.state', type: 'text' },
    { name: 'lat', label: 'sa.master.lat', type: 'number' },
    { name: 'lng', label: 'sa.master.lng', type: 'number' },
    { name: 'is_active', label: 'sa.master.active', type: 'bool' },
    { name: 'sponsored_enabled', label: 'sa.master.sponsored_on', type: 'bool' },
    { name: 'sponsored_price_per_day_paise', label: 'sa.master.price_override', type: 'number' },
  ],
  schema: schema(citySchema),
  defaults: { name: '', state: '', lat: 0, lng: 0, is_active: true, sponsored_enabled: true, sponsored_price_per_day_paise: null },
};

export const cuisineEntity: EntityConfig = {
  entity: 'cuisine',
  table: 'cuisines',
  pk: 'id',
  title: 'sa.master.cuisines',
  empty: 'sa.master.cuisines_empty',
  order: 'name',
  columns: [
    { key: 'name', label: 'common.name' },
    { key: 'is_active', label: 'sa.master.active', kind: 'bool' },
  ],
  fields: [
    { name: 'name', label: 'common.name', type: 'text' },
    { name: 'is_active', label: 'sa.master.active', type: 'bool' },
  ],
  schema: schema(cuisineSchema),
  defaults: { name: '', is_active: true },
};

export const dishCategoryEntity: EntityConfig = {
  ...cuisineEntity,
  entity: 'dish_category',
  table: 'dish_categories',
  title: 'sa.master.dish_categories',
  empty: 'sa.master.dish_categories_empty',
  schema: schema(dishCategorySchema),
};

export const reportReasonEntity: EntityConfig = {
  entity: 'report_reason',
  table: 'report_reasons',
  pk: 'id',
  title: 'sa.master.report_reasons',
  empty: 'sa.master.report_reasons_empty',
  order: 'sort_order',
  columns: [
    { key: 'label', label: 'sa.master.label' },
    { key: 'sort_order', label: 'sa.master.sort_order' },
    { key: 'is_active', label: 'sa.master.active', kind: 'bool' },
  ],
  fields: [
    { name: 'label', label: 'sa.master.label', type: 'text' },
    { name: 'sort_order', label: 'sa.master.sort_order', type: 'number' },
    { name: 'is_active', label: 'sa.master.active', type: 'bool' },
  ],
  schema: schema(reportReasonSchema),
  defaults: { label: '', sort_order: 0, is_active: true },
};

export const badgeEntity: EntityConfig = {
  entity: 'badge_definition',
  table: 'badge_definitions',
  pk: 'id',
  title: 'sa.master.badges',
  empty: 'sa.master.badges_empty',
  order: 'threshold',
  columns: [
    { key: 'name', label: 'common.name' },
    { key: 'metric', label: 'sa.master.metric' },
    { key: 'threshold', label: 'sa.master.threshold' },
    { key: 'scope', label: 'sa.master.scope' },
    { key: 'is_active', label: 'sa.master.active', kind: 'bool' },
  ],
  fields: [
    { name: 'name', label: 'common.name', type: 'text' },
    { name: 'metric', label: 'sa.master.metric', type: 'select', options: options(badgeMetrics) },
    { name: 'threshold', label: 'sa.master.threshold', type: 'number' },
    { name: 'scope', label: 'sa.master.scope', type: 'select', options: options(['global', 'restaurant']) },
    { name: 'icon', label: 'sa.master.icon', type: 'select', options: options(badgeIcons) },
    { name: 'is_active', label: 'sa.master.active', type: 'bool' },
  ],
  schema: schema(badgeDefinitionSchema),
  defaults: { name: '', metric: 'stories_posted', threshold: 1, scope: 'global', icon: 'award', is_active: true },
};

export const flagEntity: EntityConfig = {
  entity: 'feature_flag',
  table: 'feature_flags',
  pk: 'key',
  title: 'sa.master.flags',
  empty: 'sa.master.flags_empty',
  order: 'key',
  columns: [
    { key: 'key', label: 'sa.master.flag_key' },
    { key: 'is_enabled', label: 'sa.master.enabled', kind: 'bool' },
    { key: 'rollout_percent', label: 'sa.master.rollout' },
  ],
  fields: [
    { name: 'key', label: 'sa.master.flag_key', type: 'text' },
    { name: 'description', label: 'sa.master.description', type: 'text' },
    { name: 'is_enabled', label: 'sa.master.enabled', type: 'bool' },
    { name: 'rollout_percent', label: 'sa.master.rollout', type: 'number' },
    { name: 'city_ids', label: 'sa.master.flag_cities', type: 'cities' },
  ],
  schema: schema(featureFlagSchema),
  defaults: { key: '', description: '', is_enabled: false, rollout_percent: 100, city_ids: [] },
};

export const slideEntity: EntityConfig = {
  entity: 'onboarding_slide',
  table: 'onboarding_slides',
  pk: 'id',
  title: 'sa.content.slides',
  empty: 'sa.content.slides_empty',
  order: 'sort_order',
  columns: [
    { key: 'title', label: 'sa.content.title' },
    { key: 'sort_order', label: 'sa.master.sort_order' },
    { key: 'is_published', label: 'sa.content.published', kind: 'bool' },
  ],
  fields: [
    { name: 'title', label: 'sa.content.title', type: 'text' },
    { name: 'body', label: 'sa.content.body', type: 'textarea' },
    { name: 'icon', label: 'sa.master.icon', type: 'text' },
    { name: 'sort_order', label: 'sa.master.sort_order', type: 'number' },
    { name: 'is_published', label: 'sa.content.published', type: 'bool' },
  ],
  schema: schema(onboardingSlideSchema),
  defaults: { title: '', body: '', icon: 'sparkles', sort_order: 0, is_published: false },
};

export const faqEntity: EntityConfig = {
  entity: 'faq',
  table: 'faqs',
  pk: 'id',
  title: 'sa.content.faqs',
  empty: 'sa.content.faqs_empty',
  order: 'sort_order',
  columns: [
    { key: 'question', label: 'sa.content.question' },
    { key: 'audience', label: 'sa.content.audience' },
    { key: 'is_published', label: 'sa.content.published', kind: 'bool' },
  ],
  fields: [
    { name: 'question', label: 'sa.content.question', type: 'text' },
    { name: 'answer', label: 'sa.content.answer', type: 'textarea' },
    { name: 'audience', label: 'sa.content.audience', type: 'select', options: options(['customer', 'restaurant']) },
    { name: 'sort_order', label: 'sa.master.sort_order', type: 'number' },
    { name: 'is_published', label: 'sa.content.published', type: 'bool' },
  ],
  schema: schema(faqSchema),
  defaults: { question: '', answer: '', audience: 'customer', sort_order: 0, is_published: false },
};

export const templateEntity: EntityConfig = {
  entity: 'notification_template',
  table: 'notification_templates',
  pk: 'id',
  title: 'sa.content.templates',
  empty: 'sa.content.templates_empty',
  order: 'event',
  columns: [
    { key: 'event', label: 'sa.content.event' },
    { key: 'locale', label: 'sa.content.locale' },
    { key: 'title', label: 'sa.content.title' },
    { key: 'is_enabled', label: 'sa.master.enabled', kind: 'bool' },
  ],
  fields: [
    { name: 'event', label: 'sa.content.event', type: 'select', options: options(notificationEvents) },
    { name: 'locale', label: 'sa.content.locale', type: 'text' },
    { name: 'title', label: 'sa.content.title', type: 'text' },
    { name: 'body', label: 'sa.content.body', type: 'textarea' },
    { name: 'is_enabled', label: 'sa.master.enabled', type: 'bool' },
  ],
  schema: schema(notificationTemplateSchema),
  defaults: { event: 'friend_redeemed', locale: 'en', title: '', body: '', is_enabled: true },
};

export const breachEntity: EntityConfig = {
  entity: 'breach',
  table: 'breach_log',
  pk: 'id',
  title: 'sa.privacy.breaches',
  empty: 'sa.privacy.breaches_empty',
  order: 'detected_at',
  columns: [
    { key: 'summary', label: 'sa.privacy.summary' },
    { key: 'detected_at', label: 'sa.privacy.detected' },
    { key: 'affected_count', label: 'sa.privacy.affected' },
  ],
  fields: [
    { name: 'summary', label: 'sa.privacy.summary', type: 'text' },
    { name: 'detected_at', label: 'sa.privacy.detected', type: 'text' },
    { name: 'affected_count', label: 'sa.privacy.affected', type: 'number' },
    { name: 'notified_authority_at', label: 'sa.privacy.authority_notified', type: 'text' },
    { name: 'notes', label: 'sa.privacy.notes', type: 'textarea' },
  ],
  schema: schema(breachSchema),
  defaults: { summary: '', detected_at: new Date().toISOString(), affected_count: 0, notified_authority_at: null, notes: '' },
};
