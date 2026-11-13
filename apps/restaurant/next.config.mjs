import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Every app and script reads the one .env at the repository root. Hosting platforms inject the same names.
const rootEnv = resolve(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'LINK_DOMAIN'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Environment is incomplete. Fill these names in .env: ${missing.join(', ')}`);
}

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  transpilePackages: ['@datapal/core', '@datapal/i18n', '@datapal/ui-tokens', '@datapal/ui-web', '@datapal/web-kit'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_LINK_DOMAIN: process.env.LINK_DOMAIN,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};
