'use client';

import type { RestaurantRole } from '@datapal/core';
import { EmptyState, useT } from '@datapal/ui-web';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRestaurant } from './restaurant-context';

/** Every screen declares which roles may open it. A cashier can open the redeem screen and nothing else. */
export function RoleScreen({ roles, children }: { roles: RestaurantRole[]; children: ReactNode }) {
  const { restaurant } = useRestaurant();
  const t = useT();
  if (!roles.includes(restaurant.role)) {
    return <EmptyState icon={Lock} title={t('errors.not_permitted')} body={t('rd.screen.no_access')} />;
  }
  return <>{children}</>;
}
