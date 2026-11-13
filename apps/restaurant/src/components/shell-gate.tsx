'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LegalGate } from './legal-gate';
import { useRestaurant } from './restaurant-context';
import { StatusScreen } from './status-screen';

/** Decides what the signed-in restaurant sees: onboarding, a status screen, or the dashboard. */
export function ShellGate({ children }: { children: ReactNode }) {
  const { restaurant } = useRestaurant();
  const router = useRouter();

  useEffect(() => {
    if (restaurant.status === 'draft') router.replace('/onboarding');
  }, [restaurant.status, router]);

  if (restaurant.status === 'draft') return null;
  if (restaurant.status !== 'approved') return <StatusScreen />;
  return <LegalGate>{children}</LegalGate>;
}
