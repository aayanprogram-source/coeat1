import Constants from 'expo-constants';
import { z } from 'zod';

const schema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  linkDomain: z.string().min(1),
});

const parsed = schema.safeParse(Constants.expoConfig?.extra);
if (!parsed.success) {
  throw new Error('Environment is incomplete. Fill SUPABASE_URL, SUPABASE_ANON_KEY and LINK_DOMAIN in .env and rebuild.');
}

export const env = parsed.data;
