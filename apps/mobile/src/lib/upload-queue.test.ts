import { describe, expect, it } from 'vitest';
import { backoff, enqueue, flush, type QueuedStory, type QueueStorage } from './upload-queue';

function memory(): QueueStorage & { items: QueuedStory[] } {
  const state = { items: [] as QueuedStory[] };
  return {
    get items() {
      return state.items;
    },
    read: async () => [...state.items],
    write: async (next) => {
      state.items = next;
    },
  };
}

const base = { id: 's1', userId: 'u1', checkinId: 'c1', photoUri: 'file://a.jpg', caption: 'good', dishes: [{ menu_item_id: 'm1', rating: 5 }] };

describe('upload queue', () => {
  it('posts due stories and clears them', async () => {
    const storage = memory();
    await enqueue(storage, base, 1000);
    const result = await flush(storage, { now: () => 1000, uploadPhoto: async () => 'u1/p.jpg', postStory: async () => undefined, isPermanent: () => false });
    expect(result.posted).toEqual(['s1']);
    expect(storage.items).toHaveLength(0);
  });

  it('keeps a story on a network failure and retries it later with backoff', async () => {
    const storage = memory();
    await enqueue(storage, base, 1000);
    const failing = { uploadPhoto: async () => { throw new Error('offline'); }, postStory: async () => undefined, isPermanent: () => false };
    const first = await flush(storage, { ...failing, now: () => 1000 });
    expect(first.retrying).toEqual(['s1']);
    expect(storage.items[0]?.attempts).toBe(1);
    expect(storage.items[0]?.nextAttemptAt).toBe(1000 + backoff(0));
    const tooSoon = await flush(storage, { ...failing, now: () => 2000 });
    expect(tooSoon.retrying).toEqual([]);
    const later = await flush(storage, { uploadPhoto: async () => 'p', postStory: async () => undefined, isPermanent: () => false, now: () => 1000 + backoff(0) });
    expect(later.posted).toEqual(['s1']);
  });

  it('drops a story the server permanently refuses', async () => {
    const storage = memory();
    await enqueue(storage, base, 0);
    const result = await flush(storage, { now: () => 0, uploadPhoto: async () => 'p', postStory: async () => { throw new Error('checkin_expired'); }, isPermanent: () => true });
    expect(result.dropped).toEqual(['s1']);
    expect(storage.items).toHaveLength(0);
  });

  it('caps the backoff', () => {
    expect(backoff(20)).toBe(5 * 60_000);
  });
});
