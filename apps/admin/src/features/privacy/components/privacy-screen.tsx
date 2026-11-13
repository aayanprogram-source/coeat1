import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { EntityManager } from '@/components/entity-manager';
import { Screen } from '@/components/screen';
import { breachEntity } from '@/features/master-data/entities';
import { RequestsPanel } from './requests-panel';
'use client';



export function PrivacyScreen() {
  const t = useT();
  return (
    <Screen permission="data_requests.view">
      <PageHeader title={t('sa.data_requests.title')} />
      <Tabs
        items={[
          { value: 'requests', label: t('sa.data_requests.title'), content: <RequestsPanel /> },
          { value: 'breaches', label: t('sa.data_requests.breaches'), content: <EntityManager config={breachEntity} embedded /> },
        ]}
      />
    </Screen>
  );
}
