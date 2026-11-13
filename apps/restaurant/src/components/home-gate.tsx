'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useRestaurant } from './restaurant-context';

/** Cashiers can only open the redeem screen, so the home page sends them straight there. */
export function HomeGate({ children }: { children: ReactNode }) {
  const { restaurant } = useRestaurant();
  const router = useRouter();
  const cashier = restaurant.role === 'cashier';

  useEffect(() => {
    if (cashier) router.replace('/redeem');
  }, [cashier, router]);

  return cashier ? null : <>{children}</>;
}
