import { admin } from './en/admin';
import { adminScreens } from './en/admin-screens';
import { common } from './en/common';
import { customer } from './en/customer';
import { errors } from './en/errors';
import { restaurant } from './en/restaurant';

export const baseStrings = { ...common, ...errors, ...customer, ...restaurant, ...admin, ...adminScreens } as const;
export type StringKey = keyof typeof baseStrings;
export const stringKeys = Object.keys(baseStrings) as StringKey[];

export type Overrides = Record<string, Record<string, string>>;
export type Params = Record<string, string | number>;

export interface Translator {
  t: (key: StringKey, params?: Params) => string;
  locale: string;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(locale: string, overrides: Overrides): Translator {
  const localeOverrides = overrides[locale] ?? {};
  const fallbackOverrides = overrides['en'] ?? {};
  return {
    locale,
    t(key, params) {
      const template = localeOverrides[key] ?? fallbackOverrides[key] ?? baseStrings[key];
      return interpolate(template, params);
    },
  };
}

export function errorKey(message: string | undefined): StringKey {
  const candidate = `errors.${message ?? ''}`;
  return candidate in baseStrings ? (candidate as StringKey) : 'errors.unknown';
}
