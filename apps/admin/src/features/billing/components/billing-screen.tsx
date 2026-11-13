'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { ExportPanel } from './export-panel';
import { InvoicesPanel } from './invoices-panel';
import { LedgerPanel } from './ledger-panel';

export function BillingScreen() {
  const t = useT();
  return (
    <Screen permission="billing.view">
      <PageHeader title={t('sa.nav.billing')} />
      <Tabs
        items={[
          { value: 'invoices', label: t('rd.billing.invoices'), content: <InvoicesPanel /> },
          { value: 'ledger', label: t('rd.billing.ledger'), content: <LedgerPanel /> },
          { value: 'export', label: t('sa.billing.accountant_csv'), content: <ExportPanel /> },
        ]}
      />
    </Screen>
  );
}
