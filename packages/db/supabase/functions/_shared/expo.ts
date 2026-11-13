import { fetchWithRetry } from './http.ts';

export interface PushItem {
  id: string;
  detail: string | null;
  tokens: string[];
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
}

export interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export function buildMessages(items: PushItem[]): { messages: ExpoMessage[]; owners: string[] } {
  const messages: ExpoMessage[] = [];
  const owners: string[] = [];
  for (const item of items) {
    const [title = '', ...rest] = (item.detail ?? '').split('\n');
    for (const token of item.tokens) {
      messages.push({ to: token, title, body: rest.join('\n'), sound: 'default' });
      owners.push(item.id);
    }
  }
  return { messages, owners };
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function sendExpoBatch(accessToken: string, messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  const response = await fetchWithRetry('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo responded ${response.status}`);
  const parsed = (await response.json()) as { data: ExpoTicket[] };
  return parsed.data;
}

export async function fetchExpoReceipts(
  accessToken: string,
  ids: string[],
): Promise<Record<string, { status: 'ok' | 'error'; details?: { error?: string } }>> {
  const response = await fetchWithRetry('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error(`Expo responded ${response.status}`);
  const parsed = (await response.json()) as { data: Record<string, { status: 'ok' | 'error'; details?: { error?: string } }> };
  return parsed.data;
}

export function isDeadToken(error: string | undefined): boolean {
  return error === 'DeviceNotRegistered';
}
