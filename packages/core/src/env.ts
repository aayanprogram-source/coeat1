import { z } from 'zod';

const nonEmpty = (name: string) => z.string().trim().min(1, `${name} is missing`);

export const publicEnvSchema = z.object({
  SUPABASE_URL: nonEmpty('SUPABASE_URL').url(),
  SUPABASE_ANON_KEY: nonEmpty('SUPABASE_ANON_KEY'),
  LINK_DOMAIN: nonEmpty('LINK_DOMAIN'),
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_PROJECT_REF: nonEmpty('SUPABASE_PROJECT_REF'),
  DATABASE_URL: nonEmpty('DATABASE_URL'),
  SEND_SMS_HOOK_SECRET: nonEmpty('SEND_SMS_HOOK_SECRET'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function fail(result: z.SafeParseError<unknown>): never {
  const names = result.error.issues.map((i) => i.path.join('.')).filter(Boolean);
  throw new Error(`Environment is incomplete. Fill these names in .env: ${names.join(', ')}`);
}

export function readPublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  return result.success ? result.data : fail(result);
}

export function readServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  return result.success ? result.data : fail(result);
}
