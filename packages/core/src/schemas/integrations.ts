import { z } from 'zod';

export const integrationProviders = [
  'sms_msg91',
  'sms_twilio',
  'email_smtp',
  'push_expo',
  'maps_google',
  'payments_razorpay',
] as const;
export type IntegrationProvider = (typeof integrationProviders)[number];
export type IntegrationKind = 'sms' | 'email' | 'push' | 'maps' | 'payments';

export interface IntegrationField {
  readonly name: string;
  readonly label: string;
  readonly secret: boolean;
  readonly required: boolean;
}

export interface IntegrationDefinition {
  readonly provider: IntegrationProvider;
  readonly label: string;
  readonly kind: IntegrationKind;
  readonly fields: readonly IntegrationField[];
  readonly testable: boolean;
}

export const integrationDefinitions: readonly IntegrationDefinition[] = [
  {
    provider: 'sms_msg91',
    label: 'MSG91 (SMS OTP)',
    kind: 'sms',
    testable: true,
    fields: [
      { name: 'auth_key', label: 'Auth key', secret: true, required: true },
      { name: 'sender_id', label: 'Sender ID', secret: false, required: true },
      { name: 'dlt_entity_id', label: 'DLT entity ID', secret: false, required: true },
      { name: 'dlt_template_id', label: 'DLT template ID', secret: false, required: true },
    ],
  },
  {
    provider: 'sms_twilio',
    label: 'Twilio (SMS OTP)',
    kind: 'sms',
    testable: true,
    fields: [
      { name: 'account_sid', label: 'Account SID', secret: false, required: true },
      { name: 'auth_token', label: 'Auth token', secret: true, required: true },
      { name: 'sender_id', label: 'Sender ID or number', secret: false, required: true },
      { name: 'dlt_entity_id', label: 'DLT entity ID', secret: false, required: false },
      { name: 'dlt_template_id', label: 'DLT template ID', secret: false, required: false },
    ],
  },
  {
    provider: 'email_smtp',
    label: 'Email (SMTP)',
    kind: 'email',
    testable: true,
    fields: [
      { name: 'host', label: 'SMTP host', secret: false, required: true },
      { name: 'port', label: 'SMTP port', secret: false, required: true },
      { name: 'username', label: 'Username', secret: false, required: true },
      { name: 'password', label: 'Password', secret: true, required: true },
      { name: 'from_email', label: 'From email', secret: false, required: true },
      { name: 'from_name', label: 'From name', secret: false, required: true },
    ],
  },
  {
    provider: 'push_expo',
    label: 'Push (Expo)',
    kind: 'push',
    testable: false,
    fields: [{ name: 'access_token', label: 'Expo access token', secret: true, required: true }],
  },
  {
    provider: 'maps_google',
    label: 'Google Maps Platform',
    kind: 'maps',
    testable: true,
    fields: [
      { name: 'mobile_key', label: 'Restricted key for mobile', secret: false, required: true },
      { name: 'web_key', label: 'Restricted key for web', secret: false, required: true },
      { name: 'server_key', label: 'Server key for geocoding', secret: true, required: true },
    ],
  },
  {
    provider: 'payments_razorpay',
    label: 'Razorpay payment links',
    kind: 'payments',
    testable: true,
    fields: [
      { name: 'key_id', label: 'Key ID', secret: false, required: true },
      { name: 'key_secret', label: 'Key secret', secret: true, required: true },
      { name: 'webhook_secret', label: 'Webhook secret', secret: true, required: true },
    ],
  },
];

export function integrationDefinition(provider: IntegrationProvider): IntegrationDefinition {
  const def = integrationDefinitions.find((d) => d.provider === provider);
  if (!def) throw new Error(`Unknown provider ${provider}`);
  return def;
}

export function integrationSchema(provider: IntegrationProvider) {
  const def = integrationDefinition(provider);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields) {
    shape[f.name] = f.required
      ? z.string().trim().min(1, `${f.label} is required`).max(500)
      : z.string().trim().max(500);
  }
  return z.object(shape);
}
