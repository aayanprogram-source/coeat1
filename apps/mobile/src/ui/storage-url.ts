import { supabase } from '@/lib/supabase';

export function publicUrl(bucket: 'avatars' | 'story-photos' | 'restaurant-media', path: string | null | undefined): string | null {
  return path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
}
