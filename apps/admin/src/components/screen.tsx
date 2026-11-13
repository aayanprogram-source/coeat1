'use client';

import type { PermissionKey } from '@datapal/core';
import { EmptyState, useT } from '@datapal/ui-web';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCan } from './admin-context';

/** Every screen declares the permission it needs. Without it the screen explains instead of loading data. */
export function Screen({ permission, children }: { permission: PermissionKey; children: ReactNode }) {
  const can = useCan();
  const t = useT();
  if (!can(permission)) {
    return <EmptyState icon={Lock} title={t('errors.not_permitted')} body={t('sa.screen.no_access')} />;
  }
  return <>{children}</>;
}
