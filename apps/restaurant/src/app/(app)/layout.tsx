import { settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';
import { serverClient } from '@datapal/web-kit/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { RestaurantProvider, type MyRestaurant } from '@/components/restaurant-context';
import { ShellGate } from '@/components/shell-gate';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await serverClient();
  await supabase.rpc('claim_staff_invites');
  const { data } = await supabase.rpc('my_restaurants');
  const restaurants = (data ?? []) as unknown as MyRestaurant[];
  if (restaurants.length === 0) redirect('/onboarding');
  const config = await fetchAppConfig();
  const productName = config ? settingString(config, 'product_name') : '';

  return (
    <RestaurantProvider restaurants={restaurants}>
      <AppShell productName={productName}>
        <ShellGate>{children}</ShellGate>
      </AppShell>
    </RestaurantProvider>
  );
}
