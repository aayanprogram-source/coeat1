export interface RetryOptions {
  timeoutMs: number;
  retries: number;
  backoffMs: number;
}

const defaults: RetryOptions = { timeoutMs: 10000, retries: 2, backoffMs: 400 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch with a timeout and retries with exponential backoff on network errors and 5xx or 429 responses. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: Partial<RetryOptions> = {},
): Promise<Response> {
  const { timeoutMs, retries, backoffMs } = { ...defaults, ...options };
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.status < 500 && response.status !== 429) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export function basicAuth(user: string, password: string): string {
  return `Basic ${btoa(`${user}:${password}`)}`;
}
