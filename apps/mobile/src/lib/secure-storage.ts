export interface KeyValueStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

const CHUNK = 1800;

/**
 * Secure storage limits each value to about 2 KB, and an auth session is larger.
 * This stores a value in numbered chunks and reassembles it on read.
 */
export function chunkedStorage(store: KeyValueStore) {
  return {
    async getItem(key: string): Promise<string | null> {
      const count = await store.getItem(`${key}.count`);
      if (count === null) return null;
      const parts: string[] = [];
      for (let i = 0; i < Number(count); i += 1) {
        const part = await store.getItem(`${key}.${i}`);
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key: string, value: string): Promise<void> {
      const previous = Number((await store.getItem(`${key}.count`)) ?? 0);
      const chunks = value.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) ?? [''];
      for (let i = 0; i < chunks.length; i += 1) await store.setItem(`${key}.${i}`, chunks[i] ?? '');
      for (let i = chunks.length; i < previous; i += 1) await store.deleteItem(`${key}.${i}`);
      await store.setItem(`${key}.count`, String(chunks.length));
    },
    async removeItem(key: string): Promise<void> {
      const count = Number((await store.getItem(`${key}.count`)) ?? 0);
      for (let i = 0; i < count; i += 1) await store.deleteItem(`${key}.${i}`);
      await store.deleteItem(`${key}.count`);
    },
  };
}
