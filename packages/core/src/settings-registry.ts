import { z } from 'zod';

export const settingGroups = ['product', 'rules', 'feed', 'sponsored', 'company', 'retention'] as const;
export type SettingGroup = (typeof settingGroups)[number];

export type SettingType = 'integer' | 'number' | 'boolean' | 'string' | 'text' | 'json';

export interface SettingDefinition {
  readonly key: string;
  readonly group: SettingGroup;
  readonly type: SettingType;
  readonly label: string;
  readonly description: string;
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
  readonly initial: string | number | boolean | Record<string, string | number | boolean>;
  readonly launchRequired?: boolean;
}

const int = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  initial: number,
  min: number,
  max: number,
  unit?: string,
): SettingDefinition => ({
  key,
  group,
  type: 'integer',
  label,
  description,
  initial,
  min,
  max,
  ...(unit ? { unit } : {}),
});

const bool = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  initial: boolean,
): SettingDefinition => ({ key, group, type: 'boolean', label, description, initial });

const str = (
  key: string,
  group: SettingGroup,
  label: string,
  description: string,
  initial: string,
  launchRequired = false,
): SettingDefinition => ({ key, group, type: 'string', label, description, initial, launchRequired });

export const settingsRegistry: readonly SettingDefinition[] = [
  str('product_name', 'product', 'Product name', 'Shown everywhere the product refers to itself.', '', true),
  str('default_locale', 'product', 'Default locale', 'Locale used when a user has not chosen one.', 'en'),
  str('support_email', 'product', 'Support email', 'Shown to users and restaurants for help.', ''),

  str('sms_otp_message', 'product', 'SMS OTP message', 'Text of the OTP SMS for providers that do not use a registered template. Use {product_name} and {otp}.', '{otp} is your {product_name} verification code.'),
  str('ios_store_url', 'product', 'iOS store URL', 'App Store link offered on the shared-story web page.', ''),
  str('android_store_url', 'product', 'Android store URL', 'Play Store link offered on the shared-story web page.', ''),
  str('apple_team_id', 'product', 'Apple team ID', 'Used in the apple-app-site-association file for universal links.', ''),
  str('android_cert_sha256', 'product', 'Android signing certificate SHA-256', 'Used in assetlinks.json for Android app links.', ''),
  int('fee_percent_default', 'rules', 'Default fee percent', 'Fee percent applied to new restaurants.', 10, 0, 100, '%'),
  int('fee_percent_min', 'rules', 'Minimum fee percent', 'Lowest fee a restaurant can be set to.', 5, 0, 100, '%'),
  int('fee_percent_max', 'rules', 'Maximum fee percent', 'Highest fee a restaurant can be set to.', 25, 0, 100, '%'),
  int('gst_percent', 'rules', 'GST percent', 'GST added on invoices.', 18, 0, 100, '%'),
  int('reward_hold_days', 'rules', 'Reward hold days', 'Days a referral credit is held after verification before release.', 3, 0, 90, 'days'),
  int('checkin_radius_m', 'rules', 'Check-in radius', 'Maximum distance from the restaurant for a valid check-in.', 150, 10, 5000, 'm'),
  int('checkin_window_minutes', 'rules', 'Check-in validity window', 'Minutes a check-in stays valid for rating and posting.', 180, 5, 1440, 'min'),
  int('story_lifetime_hours', 'rules', 'Story lifetime', 'Hours a story stays visible.', 48, 1, 720, 'h'),
  int('code_lifetime_hours', 'rules', 'Code lifetime', 'Hours a code stays valid after issue, capped by the offer end.', 72, 1, 720, 'h'),
  int('undo_window_minutes', 'rules', 'Undo window', 'Minutes a cashier can undo a redemption.', 10, 0, 240, 'min'),
  int('rating_edit_window_hours', 'rules', 'Rating edit window', 'Hours a rating can be edited after posting.', 24, 0, 720, 'h'),
  int('max_codes_per_offer', 'rules', 'Maximum codes per offer', 'Upper bound on codes a single offer can hold.', 500, 1, 100000),
  int('max_discount_percent', 'rules', 'Maximum discount percent', 'Upper bound on discount percent for any offer.', 50, 1, 100, '%'),
  int('max_discount_cap_paise', 'rules', 'Maximum discount cap', 'Upper bound on the rupee cap of a discount, in paise.', 50000, 100, 10000000, 'paise'),
  int('min_bill_floor_paise', 'rules', 'Minimum bill floor', 'Lowest minimum bill an offer can set, in paise.', 20000, 0, 10000000, 'paise'),
  int('group_credit_cap_default', 'rules', 'Group credit cap default', 'Default number of new members per group visit that earn credit.', 3, 1, 50),
  int('group_credit_cap_max', 'rules', 'Group credit cap maximum', 'Highest group credit cap an offer can set.', 8, 1, 50),
  int('code_request_rate_limit_per_hour', 'rules', 'Code request rate limit', 'Code requests a user may make per hour.', 10, 1, 1000),
  int('failed_code_limit_per_10min', 'rules', 'Failed code limit', 'Failed redemption attempts a cashier may make in 10 minutes before being paused.', 10, 3, 100),
  int('fraud_device_accounts_threshold', 'rules', 'Device cluster threshold', 'Accounts on one device before it is flagged.', 3, 2, 50),
  int('fraud_bill_anomaly_percent', 'rules', 'Bill anomaly threshold', 'Flag a restaurant when its average redeemed bill is below this percent of its average menu price.', 30, 1, 100, '%'),
  int('code_ending_soon_hours', 'rules', 'Code ending soon', 'Hours before expiry when the holder is reminded.', 2, 1, 48, 'h'),
  int('data_request_due_days', 'retention', 'Data request due days', 'Days allowed to fulfil a data export or deletion request.', 30, 1, 90, 'days'),
  int('login_max_failures', 'rules', 'Login failures before lockout', 'Failed dashboard sign-ins before the account is locked.', 5, 3, 20),
  int('login_lockout_minutes', 'rules', 'Login lockout minutes', 'Minutes a dashboard account stays locked after too many failures.', 15, 1, 1440, 'min'),
  int('dashboard_idle_minutes', 'rules', 'Dashboard idle timeout', 'Minutes of inactivity before a dashboard session ends.', 30, 5, 480, 'min'),
  int('alert_limit_per_week', 'rules', 'Alert limit per week', 'Maximum push alerts sent to one user per week.', 5, 0, 100),
  int('minimum_age', 'rules', 'Minimum age', 'Age users must confirm at sign-up.', 18, 13, 21, 'years'),
  bool('offers_need_approval', 'rules', 'Offers need approval', 'New offers wait for platform approval before going live.', true),

  int('nearby_radius_m', 'feed', 'Nearby radius', 'Distance used by the Nearby filter and Explore list.', 5000, 100, 100000, 'm'),
  int('ending_soon_threshold_hours', 'feed', 'Ending soon threshold', 'Offers ending within this many hours count as ending soon.', 6, 1, 168, 'h'),
  int('low_stock_threshold', 'feed', 'Low stock threshold', 'Remaining codes at or below this show as low stock.', 5, 0, 1000),
  int('feed_page_size', 'feed', 'Feed page size', 'Items per page in the feed.', 20, 5, 100),
  bool('show_live_counters', 'feed', 'Show live counters', 'Show remaining-code counters on cards.', true),

  bool('sponsored_enabled', 'sponsored', 'Sponsored placements', 'Allow restaurants to buy sponsored placements.', false),
  int('sponsored_price_per_day_paise', 'sponsored', 'Price per placement per day', 'Default price per day per placement, in paise. Cities can override.', 50000, 0, 100000000, 'paise'),
  int('sponsored_feed_interval', 'sponsored', 'Feed cards between sponsored cards', 'Number of organic cards between sponsored cards.', 6, 1, 100),
  int('sponsored_max_per_session', 'sponsored', 'Maximum sponsored cards per session', 'Upper bound of sponsored cards one feed load returns.', 3, 0, 50),
  bool('boosts_need_approval', 'sponsored', 'Boosts need approval', 'New boosts wait for platform approval.', true),
  str('sponsored_label', 'sponsored', 'Sponsored label', 'Label shown on every sponsored card.', 'Sponsored'),

  str('company_legal_name', 'company', 'Legal name', 'Company name printed on invoices.', '', true),
  str('company_gstin', 'company', 'GSTIN', 'Company GST identification number.', '', true),
  {
    key: 'company_address',
    group: 'company',
    type: 'text',
    label: 'Registered address',
    description: 'Address printed on invoices.',
    initial: '',
    launchRequired: true,
  },
  str('company_state_code', 'company', 'State code', 'GST state code used to decide CGST and SGST versus IGST.', '', true),
  str('sac_code', 'company', 'SAC code', 'Service accounting code printed on invoices.', '', true),
  str('invoice_prefix', 'company', 'Invoice prefix', 'Prefix for sequential invoice numbers.', 'INV', true),
  int('invoice_next_number', 'company', 'Next invoice number', 'Number given to the next invoice.', 1, 1, 100000000),
  int('invoice_day_of_month', 'company', 'Invoice day of month', 'Day of the month invoices are generated for the previous period.', 1, 1, 28),
  int('invoice_due_days', 'company', 'Invoice due days', 'Days after issue when an invoice becomes overdue.', 15, 1, 90, 'days'),
  {
    key: 'bank_details',
    group: 'company',
    type: 'json',
    label: 'Bank details',
    description: 'Account name, account number, IFSC and bank name printed on invoices.',
    initial: { account_name: '', account_number: '', ifsc: '', bank_name: '' },
    launchRequired: true,
  },
  str('company_upi_id', 'company', 'UPI ID', 'UPI ID restaurants can pay invoices to.', '', true),
  str('grievance_officer_name', 'company', 'Grievance officer name', 'Shown in the app as required by DPDP.', '', true),
  str('grievance_officer_contact', 'company', 'Grievance officer contact', 'Email or phone shown in the app.', '', true),

  int('log_retention_days', 'retention', 'Log retention', 'Days to keep notification, error and audit logs.', 365, 30, 3650, 'days'),
  int('anonymise_delay_days', 'retention', 'Anonymisation delay', 'Days after account deletion before personal data is anonymised.', 30, 0, 365, 'days'),
];

const byKey = new Map(settingsRegistry.map((s) => [s.key, s] as const));

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return byKey.get(key);
}

export function settingValueSchema(def: SettingDefinition): z.ZodTypeAny {
  switch (def.type) {
    case 'integer': {
      let s = z.number().int();
      if (def.min !== undefined) s = s.min(def.min);
      if (def.max !== undefined) s = s.max(def.max);
      return s;
    }
    case 'number': {
      let s = z.number();
      if (def.min !== undefined) s = s.min(def.min);
      if (def.max !== undefined) s = s.max(def.max);
      return s;
    }
    case 'boolean':
      return z.boolean();
    case 'string':
      return z.string().max(500);
    case 'text':
      return z.string().max(20000);
    case 'json':
      return z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
  }
}

export function validateSettingValue(
  key: string,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
  const def = byKey.get(key);
  if (!def) return { ok: false, message: `Unknown setting ${key}` };
  const result = settingValueSchema(def).safeParse(value);
  if (!result.success) return { ok: false, message: result.error.issues.map((i) => i.message).join('; ') };
  return { ok: true, value: result.data };
}
