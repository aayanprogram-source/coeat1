/**
 * Maps an incoming link to an app route. Handles universal and app links on the configured domain,
 * the custom scheme, and relative paths. Returns null for anything else.
 */
export function routeForUrl(url: string, linkDomain: string, scheme: string): string | null {
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && parsed.host === linkDomain) path = parsed.pathname;
    else if (parsed.protocol === `${scheme}:`) path = `/${parsed.host}${parsed.pathname}`.replace(/\/+/g, '/');
    else return null;
  } catch {
    return null;
  }
  const match = /^\/(s|p|t)\/([A-Za-z0-9-]{8,64})\/?$/.exec(path);
  if (!match) return null;
  const [, kind, id] = match;
  if (kind === 's') return `/story/${id}`;
  if (kind === 'p') return `/poll/${id}`;
  return `/group/join?token=${id}`;
}
