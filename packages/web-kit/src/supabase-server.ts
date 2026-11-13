import type { Database } from '@datapal/core';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function serverClient() {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            for (const { name, value, options } of items) store.set(name, value, options);
          } catch {
            // Server Components cannot set cookies; the middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
