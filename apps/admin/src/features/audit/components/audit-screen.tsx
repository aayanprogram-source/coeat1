import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { AuditPanel } from './audit-panel';
import { ErrorsPanel } from './errors-panel';
'use client';




export function AuditScreen() {
  const t = useT();
  return (
    <Screen permission="audit.view">
      <PageHeader title={t('sa.nav.audit')} />
      <Tabs
        items={[
          { value: 'audit', label: t('sa.nav.audit'), content: <AuditPanel /> },
          { value: 'errors', label: t('sa.nav.errors'), content: <ErrorsPanel /> },
        ]}
      />
    </Screen>
  );
}
