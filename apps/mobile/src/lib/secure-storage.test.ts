import { describe, expect, it } from 'vitest';
import { chunkedStorage, type KeyValueStore } from './secure-storage';

function memory(): KeyValueStore & { size: () => number } {
  const map = new Map<string, string>();
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => void map.set(k, v),
    deleteItem: async (k) => void map.delete(k),
    size: () => map.size,
  };
}

describe('chunkedStorage', () => {
  it('round-trips a value larger than one chunk', async () => {
    const store = chunkedStorage(memory());
    const value = 'x'.repeat(5000) + '\nend';
    await store.setItem('session', value);
    expect(await store.getItem('session')).toBe(value);
  });

  it('removes stale chunks when a value shrinks and everything on remove', async () => {
    const mem = memory();
    const store = chunkedStorage(mem);
    await store.setItem('session', 'y'.repeat(4000));
    await store.setItem('session', 'short');
    expect(await store.getItem('session')).toBe('short');
    expect(mem.size()).toBe(2);
    await store.removeItem('session');
    expect(mem.size()).toBe(0);
    expect(await store.getItem('session')).toBeNull();
  });
});
