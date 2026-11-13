import { ApiError } from '@datapal/core';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import { call } from './rpc';
import { readJson, writeJson } from './storage';
import { supabase } from './supabase';
import { enqueue, flush, type FlushResult, type QueuedStory, type QueueStorage } from './upload-queue';

const KEY = 'story-queue';

const storage: QueueStorage = {
  read: async () => (await readJson<QueuedStory[]>(KEY)) ?? [],
  write: (items) => writeJson(KEY, items),
};

// A refusal that retrying cannot fix: the check-in expired, the dish left the menu, or the account changed.
const permanent = new Set(['checkin_expired', 'checkin_required', 'menu_item_unavailable', 'not_authenticated', 'invalid_input']);

/** Shrinks a photo before upload so slow connections stay usable. */
export async function preparePhoto(uri: string): Promise<string> {
  const rendered = await ImageManipulator.ImageManipulator.manipulate(uri).resize({ width: 1440 }).renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
  return saved.uri;
}

async function uploadPhoto(uri: string, userId: string): Promise<string> {
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from('story-photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function queueStory(story: Omit<QueuedStory, 'id' | 'attempts' | 'nextAttemptAt'>): Promise<void> {
  await enqueue(storage, { ...story, id: Crypto.randomUUID() }, Date.now());
}

export function flushStories(): Promise<FlushResult> {
  return flush(storage, {
    now: Date.now,
    uploadPhoto,
    postStory: async (story, photoPath) => {
      await call('post_story', { p_checkin_id: story.checkinId, p_photo_path: photoPath, p_caption: story.caption, p_dishes: story.dishes });
    },
    isPermanent: (error) => error instanceof ApiError && permanent.has(error.code),
  });
}

export async function pendingStoryCount(): Promise<number> {
  return (await storage.read()).length;
}
