import type { Api } from '@datapal/core';

/** Calls an Edge Function as the signed-in user. Returns null when the call fails. */
export async function invokeFunction<T>(api: Api, name: string, body: Record<string, unknown>): Promise<T | null> {
  const result = await api.functions.invoke<T>(name, { body });
  if (result.error) return null;
  return result.data;
}
