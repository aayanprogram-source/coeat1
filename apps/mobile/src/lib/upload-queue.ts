export interface QueuedStory {
  id: string;
  userId: string;
  checkinId: string;
  photoUri: string;
  caption: string;
  dishes: { menu_item_id: string; rating: number }[];
  attempts: number;
  nextAttemptAt: number;
}

export interface QueueStorage {
  read: () => Promise<QueuedStory[]>;
  write: (items: QueuedStory[]) => Promise<void>;
}

export interface FlushDeps {
  uploadPhoto: (uri: string, userId: string) => Promise<string>;
  postStory: (story: QueuedStory, photoPath: string) => Promise<void>;
  isPermanent: (error: unknown) => boolean;
  now: () => number;
}

export interface FlushResult {
  posted: string[];
  dropped: string[];
  retrying: string[];
}

const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 5 * 60_000;

export function backoff(attempts: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** attempts, MAX_DELAY_MS);
}

export async function enqueue(storage: QueueStorage, story: Omit<QueuedStory, 'attempts' | 'nextAttemptAt'>, now: number): Promise<void> {
  const items = await storage.read();
  await storage.write([...items, { ...story, attempts: 0, nextAttemptAt: now }]);
}

/**
 * Sends every story that is due. A permanent refusal (for example an expired check-in) drops the story,
 * anything else is retried later with exponential backoff, so entered data is never lost to a bad network.
 */
export async function flush(storage: QueueStorage, deps: FlushDeps): Promise<FlushResult> {
  const result: FlushResult = { posted: [], dropped: [], retrying: [] };
  const items = await storage.read();
  const remaining: QueuedStory[] = [];
  for (const story of items) {
    if (story.nextAttemptAt > deps.now()) {
      remaining.push(story);
      continue;
    }
    try {
      const path = await deps.uploadPhoto(story.photoUri, story.userId);
      await deps.postStory(story, path);
      result.posted.push(story.id);
    } catch (error) {
      if (deps.isPermanent(error)) {
        result.dropped.push(story.id);
      } else {
        remaining.push({ ...story, attempts: story.attempts + 1, nextAttemptAt: deps.now() + backoff(story.attempts) });
        result.retrying.push(story.id);
      }
    }
  }
  await storage.write(remaining);
  return result;
}
