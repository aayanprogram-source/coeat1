'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { RoleScreen } from '@/components/role-screen';
import { LeaderboardPanel } from './leaderboard-panel';
import { LevelsPanel } from './levels-panel';
import { PendingRewardsPanel } from './pending-rewards-panel';

export function PromotersScreen() {
  const t = useT();
  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.nav.promoters')} />
      <Tabs
        items={[
          { value: 'leaderboard', label: t('rd.promoters.leaderboard'), content: <LeaderboardPanel /> },
          { value: 'levels', label: t('rd.promoters.levels'), content: <LevelsPanel /> },
          { value: 'rewards', label: t('rd.promoters.awaiting'), content: <PendingRewardsPanel /> },
        ]}
      />
    </RoleScreen>
  );
}
