'use client';

import { useT } from './i18n-provider';
import type { StringKey } from '@datapal/i18n';
import type { ReactNode } from 'react';
import { AuthCard } from './auth-card';

export function AuthPage({ titleKey, footerKey, children }: { titleKey: StringKey; footerKey?: StringKey; children: ReactNode }) {
  const t = useT();
  return (
    <AuthCard title={t(titleKey)} footer={footerKey ? t(footerKey) : undefined}>
      {children}
    </AuthCard>
  );
}
