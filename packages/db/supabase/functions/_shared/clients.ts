import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

/** A client that acts as the caller, so row level security and permission checks apply. */
export function userClient(req: Request): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

export function requireEnv(name: string): string {
  return env(name);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function logError(svc: SupabaseClient, source: string, message: string, detail: unknown): Promise<void> {
  await svc.rpc('app_error', { p_source: source, p_message: message, p_detail: detail ?? null });
}

export async function credentials(
  svc: SupabaseClient,
  provider: string,
): Promise<{ public: Record<string, string>; secrets: Record<string, string> } | null> {
  const { data, error } = await svc.rpc('integration_credentials', { p_provider: provider });
  if (error || !data) return null;
  return data as { public: Record<string, string>; secrets: Record<string, string> };
}

export async function settingValue(svc: SupabaseClient, key: string): Promise<string> {
  const { data } = await svc.from('platform_settings').select('value').eq('key', key).single();
  return typeof data?.value === 'string' ? data.value : '';
}
