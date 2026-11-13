import { appConfigSchema, flagEnabled, settingBoolean, settingNumber, settingString, type AppConfig } from '@datapal/core';
import { createTranslator, type Translator } from '@datapal/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { readJson, writeJson } from './storage';
import { supabase } from './supabase';

const CACHE_KEY = 'app-config';
const LOCALE_KEY = 'locale';

interface ConfigValue {
  config: AppConfig | null;
  translator: Translator;
  refresh: () => Promise<void>;
  locale: string;
  setLocale: (locale: string) => void;
}

const ConfigContext = createContext<ConfigValue | null>(null);

async function fetchConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase.rpc('app_config');
  if (error) return null;
  const parsed = appConfigSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Loads the published configuration on launch and whenever the app returns to the foreground,
 * keeps the last good copy for offline use, and refetches at once when the version changes.
 */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const client = useQueryClient();

  const refresh = useCallback(async () => {
    const next = await fetchConfig();
    if (!next) return;
    setConfig((current) => {
      if (current?.version === next.version) return current;
      void writeJson(CACHE_KEY, next);
      void client.invalidateQueries();
      return next;
    });
  }, [client]);

  useEffect(() => {
    void readJson<string>(LOCALE_KEY).then((saved) => saved && setChosen(saved));
    void readJson<AppConfig>(CACHE_KEY).then((cached) => cached && setConfig((current) => current ?? cached));
    void refresh();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && void refresh());
    const channel = supabase
      .channel('config-version')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config_version' }, () => void refresh())
      .subscribe();
    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const setLocale = useCallback((next: string) => {
    setChosen(next);
    void writeJson(LOCALE_KEY, next);
  }, []);

  const value = useMemo<ConfigValue>(() => {
    const locale = chosen ?? (config ? settingString(config, 'default_locale') : 'en');
    return { config, translator: createTranslator(locale, config?.translations ?? {}), refresh, locale, setLocale };
  }, [config, chosen, refresh, setLocale]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

function useConfigValue(): ConfigValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('ConfigProvider is missing');
  return ctx;
}

export function useT(): Translator['t'] {
  return useConfigValue().translator.t;
}

export function useAppConfig(): AppConfig | null {
  return useConfigValue().config;
}

export function useRefreshConfig(): () => Promise<void> {
  return useConfigValue().refresh;
}

/** Typed readers for settings; they return the fallback until the first configuration arrives. */
export function useSettings() {
  const config = useAppConfig();
  return useMemo(
    () => ({
      ready: config !== null,
      number: (key: string, fallback: number) => (config ? settingNumber(config, key) : fallback),
      bool: (key: string, fallback: boolean) => (config ? settingBoolean(config, key) : fallback),
      text: (key: string, fallback = '') => (config ? settingString(config, key) : fallback),
      flag: (key: string, cityId: string | null, userId: string | null) => (config ? flagEnabled(config, key, cityId, userId) : false),
    }),
    [config],
  );
}

export function useLocale(): { locale: string; setLocale: (locale: string) => void; available: string[] } {
  const { locale, setLocale, config } = useConfigValue();
  return { locale, setLocale, available: ['en', ...Object.keys(config?.translations ?? {}).filter((l) => l !== 'en')] };
}
