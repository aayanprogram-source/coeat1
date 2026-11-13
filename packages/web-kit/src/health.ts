import { NextResponse } from 'next/server';

/** Shared body of each dashboard's health endpoint: healthy only when the database answers. */
export async function healthResponse() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  try {
    const response = await fetch(`${url}/rest/v1/config_version?select=version`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Database responded ${response.status}`);
    return NextResponse.json({ status: 'healthy', database: 'reachable' });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', database: error instanceof Error ? error.message : 'unreachable' },
      { status: 503 },
    );
  }
}
