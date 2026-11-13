import { readJson, removeKey, writeJson } from '@/lib/storage';

export interface StoryDraft {
  restaurant: { id: string; name: string; logo_path: string | null } | null;
  checkinId: string | null;
  checkinExpiresAt: string | null;
  ratings: Record<string, number>;
  photoUri: string | null;
  caption: string;
}

export const emptyDraft: StoryDraft = { restaurant: null, checkinId: null, checkinExpiresAt: null, ratings: {}, photoUri: null, caption: '' };

const KEY = 'story-draft';

export const loadDraft = async (): Promise<StoryDraft | null> => readJson<StoryDraft>(KEY);
export const saveDraft = (draft: StoryDraft): Promise<void> => writeJson(KEY, draft);
export const clearDraft = (): Promise<void> => removeKey(KEY);

/** A check-in older than its window cannot post, so a restored draft keeps its choices but must check in again. */
export function isCheckinLive(draft: StoryDraft, now: number): boolean {
  return draft.checkinId !== null && draft.checkinExpiresAt !== null && new Date(draft.checkinExpiresAt).getTime() > now;
}
