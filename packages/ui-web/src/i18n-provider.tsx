'use client';

import { ApiError } from '@datapal/core';
import { createTranslator, errorKey, type Overrides, type Translator } from '@datapal/i18n';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const I18nContext = createContext<Translator | null>(null);

export interface I18nProviderProps {
  locale: string;
  overrides: Overrides;
  children: ReactNode;
}

export function I18nProvider({ locale, overrides, children }: I18nProviderProps) {
  const translator = useMemo(() => createTranslator(locale, overrides), [locale, overrides]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useT(): Translator['t'] {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used inside I18nProvider');
  return ctx.t;
}

/** Turns any thrown value into a friendly message from the error dictionary. */
export function useErrorMessage(): (error: unknown) => string {
  const t = useT();
  return (error) => t(errorKey(error instanceof ApiError ? error.code : undefined));
}
