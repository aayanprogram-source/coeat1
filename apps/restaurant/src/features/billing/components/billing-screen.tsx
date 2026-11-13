'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { RoleScreen } from '@/components/role-screen';
import { InvoicesPanel } from './invoices-panel';
import { LedgerPanel } from './ledger-panel';

export function BillingScreen() {
  const t = useT();
  return (
    <RoleScreen roles={['owner']}>
      <PageHeader title={t('rd.nav.billing')} />
      <Tabs
        items={[
          { value: 'invoices', label: t('rd.billing.invoices'), content: <InvoicesPanel /> },
          { value: 'ledger', label: t('rd.billing.ledger'), content: <LedgerPanel /> },
        ]}
      />
    </RoleScreen>
  );
}
