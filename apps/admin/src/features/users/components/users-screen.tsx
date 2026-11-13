'use client';

import { Tabs, PageHeader, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { ReportsPanel } from './reports-panel';
import { UsersPanel } from './users-panel';

export function UsersScreen() {
  const t = useT();
  return (
    <Screen permission="users.view">
      <PageHeader title={t('sa.nav.users')} />
      <Tabs
        items={[
          { value: 'users', label: t('sa.users.users'), content: <UsersPanel /> },
          { value: 'reports', label: t('sa.users.reports'), content: <ReportsPanel /> },
        ]}
      />
    </Screen>
  );
}
