import { appIds, settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await fetchAppConfig();
  const fingerprint = config ? settingString(config, 'android_cert_sha256') : '';
  if (!fingerprint) return new Response('Not configured', { status: 404 });
  return Response.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: appIds.android, sha256_cert_fingerprints: [fingerprint] },
    },
  ]);
}
