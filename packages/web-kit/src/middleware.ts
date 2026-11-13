import type { Database } from '@datapal/core';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export interface MiddlewareOptions {
  /** Paths anyone may open without signing in. */
  publicPaths: string[];
  /** Platform staff must have completed two-factor before any other page opens. */
  requireMfa: boolean;
  /** Extra origins the page may load, for example the maps provider. */
  extraSources?: { script?: string[]; img?: string[]; connect?: string[]; frame?: string[] };
}

const idleCookie = 'last_active';
let cachedIdleMinutes = { value: 30, at: 0 };

async function idleMinutes(): Promise<number> {
  if (Date.now() - cachedIdleMinutes.at < 60_000) return cachedIdleMinutes.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    const response = await fetch(`${url}/rest/v1/rpc/app_config`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: '{}',
    });
    const config = (await response.json()) as { settings?: Record<string, unknown> };
    const value = config.settings?.['dashboard_idle_minutes'];
    if (typeof value === 'number') cachedIdleMinutes = { value, at: Date.now() };
  } catch {
    cachedIdleMinutes = { ...cachedIdleMinutes, at: Date.now() };
  }
  return cachedIdleMinutes.value;
}

export function contentSecurityPolicy(nonce: string, extra: MiddlewareOptions['extraSources'] = {}): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const socket = supabase.replace(/^http/, 'ws');
  const dev = process.env.NODE_ENV !== 'production';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase} ${(extra.img ?? []).join(' ')}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${socket} ${(extra.connect ?? []).join(' ')}`.trim(),
    `frame-src ${(extra.frame ?? ["'none'"]).join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function createDashboardMiddleware(options: MiddlewareOptions) {
  return async function middleware(request: NextRequest) {
    const nonce = btoa(crypto.randomUUID());
    const csp = contentSecurityPolicy(nonce, options.extraSources);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('content-security-policy', csp);

    let response = NextResponse.next({ request: { headers: requestHeaders } });
    const redirect = (path: string) => {
      const target = NextResponse.redirect(new URL(path, request.url));
      target.headers.set('content-security-policy', csp);
      for (const cookie of response.cookies.getAll()) target.cookies.set(cookie);
      return target;
    };

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items) => {
            for (const { name, value } of items) request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            for (const { name, value, options: cookieOptions } of items) response.cookies.set(name, value, cookieOptions);
          },
        },
      },
    );

    const path = request.nextUrl.pathname;
    const isPublic = options.publicPaths.some((p) => path === p || path.startsWith(`${p}/`));
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      const last = Number(request.cookies.get(idleCookie)?.value ?? Date.now());
      if (Date.now() - last > (await idleMinutes()) * 60_000) {
        await supabase.auth.signOut();
        const out = redirect('/login?reason=idle');
        out.cookies.delete(idleCookie);
        return out;
      }
      response.cookies.set(idleCookie, String(Date.now()), { httpOnly: true, sameSite: 'lax', path: '/' });
    }

    if (!isPublic) {
      if (!data.user) return redirect('/login');
      if (options.requireMfa) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== 'aal2' && path !== '/mfa') return redirect('/mfa');
      }
    }

    response.headers.set('content-security-policy', csp);
    return response;
  };
}
