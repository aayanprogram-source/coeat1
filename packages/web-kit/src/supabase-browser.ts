import type { Database } from '@datapal/core';
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function browserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
  return client;
}
