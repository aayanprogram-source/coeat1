import { json, logError, serviceClient } from '../_shared/clients.ts';

// Scheduled daily from Supabase Cron, after the database job has anonymised deleted profiles.
// Removing the auth user ends sign-in for good; the anonymised profile stays for financial records.
Deno.serve(async () => {
  const svc = serviceClient();
  const { data } = await svc.rpc('purgeable_accounts', { p_limit: 100 });
  let purged = 0;
  for (const id of (data ?? []) as string[]) {
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) await logError(svc, 'purge-accounts', error.message, { id });
    else purged += 1;
  }
  return json({ purged });
});
