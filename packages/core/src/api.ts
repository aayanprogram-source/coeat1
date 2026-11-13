import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Api = SupabaseClient<Database>;
export type DbFunctions = Database['public']['Functions'];
export type FunctionName = Extract<keyof DbFunctions, string>;

/** Raised for every failed database call. The code is the machine-readable message raised in SQL. */
export class ApiError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function rpc<K extends FunctionName>(
  api: Api,
  name: K,
  args: DbFunctions[K]['Args'],
): Promise<DbFunctions[K]['Returns']> {
  const { data, error } = await api.rpc(name, args as never);
  if (error) throw new ApiError(error.message);
  return data;
}

/** For functions that return a jsonb document with a shape defined in results.ts. */
export async function rpcAs<T, K extends FunctionName>(api: Api, name: K, args: DbFunctions[K]['Args']): Promise<T> {
  return (await rpc(api, name, args)) as T;
}
