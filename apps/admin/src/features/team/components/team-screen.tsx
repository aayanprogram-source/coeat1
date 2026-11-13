'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { MembersPanel } from './members-panel';
import { RolesPanel } from './roles-panel';

export function TeamScreen() {
  const t = useT();
  return (
    <Screen permission="team.view">
      <PageHeader title={t('sa.nav.team')} />
      <Tabs
        items={[
          { value: 'members', label: t('sa.team.members'), content: <MembersPanel /> },
          { value: 'roles', label: t('sa.team.roles'), content: <RolesPanel /> },
        ]}
      />
    </Screen>
  );
}
