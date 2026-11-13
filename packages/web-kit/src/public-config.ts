import { appConfigSchema, type AppConfig } from '@datapal/core';

/** Reads the published configuration with a 60 second revalidation, so changes reach the app without a release. */
export async function fetchAppConfig(): Promise<AppConfig | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    const response = await fetch(`${url}/rest/v1/rpc/app_config`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: '{}',
      next: { revalidate: 60, tags: ['app-config'] },
    });
    if (!response.ok) return null;
    return appConfigSchema.parse(await response.json());
  } catch {
    return null;
  }
}
