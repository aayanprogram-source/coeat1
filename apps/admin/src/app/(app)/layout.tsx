import { settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';
import { serverClient } from '@datapal/web-kit/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminProvider, type AdminProfile } from '@/components/admin-context';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await serverClient();
  const { data: profile } = await supabase.rpc('my_permissions');
  if (!profile) redirect('/login');
  const config = await fetchAppConfig();
  const productName = config ? settingString(config, 'product_name') : '';

  return (
    <AdminProvider profile={profile as unknown as AdminProfile}>
      <AppShell productName={productName}>{children}</AppShell>
    </AdminProvider>
  );
}
