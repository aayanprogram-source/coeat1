'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { EntityManager } from '@/components/entity-manager';
import { badgeEntity, cityEntity, cuisineEntity, dishCategoryEntity, flagEntity, reportReasonEntity } from '../entities';

export function MasterDataScreen() {
  const t = useT();
  const tab = (value: string, label: Parameters<typeof t>[0], config: Parameters<typeof EntityManager>[0]['config']) => ({
    value,
    label: t(label),
    content: <EntityManager config={config} embedded />,
  });
  return (
    <Screen permission="master_data.view">
      <PageHeader title={t('sa.nav.master_data')} />
      <Tabs
        items={[
          tab('cities', 'sa.master.cities', cityEntity),
          tab('cuisines', 'sa.master.cuisines', cuisineEntity),
          tab('dish', 'sa.master.dish_categories', dishCategoryEntity),
          tab('reasons', 'sa.master.report_reasons', reportReasonEntity),
          tab('badges', 'sa.master.badges', badgeEntity),
          tab('flags', 'sa.master.flags', flagEntity),
        ]}
      />
    </Screen>
  );
}
