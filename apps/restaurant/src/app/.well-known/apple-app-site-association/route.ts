import { appIds, settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await fetchAppConfig();
  const team = config ? settingString(config, 'apple_team_id') : '';
  if (!team) return new Response('Not configured', { status: 404 });
  return Response.json({ applinks: { apps: [], details: [{ appID: `${team}.${appIds.ios}`, paths: ['/s/*', '/p/*'] }] } });
}
