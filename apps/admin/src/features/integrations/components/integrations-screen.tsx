'use client';

import { integrationDefinitions } from '@datapal/core';
import { ErrorState, PageHeader, Skeleton, useRows, useT } from '@datapal/ui-web';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';
import { IntegrationCard, type IntegrationRow } from './integration-card';

export function IntegrationsScreen() {
  const t = useT();
  const can = useCan();
  const rows = useRows<IntegrationRow[]>(
    ['rows', 'integrations'],
    (api) => api.from('integrations').select('provider, status, public_config, secret_hints, last_test_at, last_test_ok, last_test_message') as never,
  );
  const byProvider = new Map((rows.data ?? []).map((r) => [r.provider, r]));

  return (
    <Screen permission="integrations.view">
      <PageHeader title={t('sa.nav.integrations')} description={t('sa.integrations.intro')} />
      {rows.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void rows.refetch()} />
      ) : rows.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          {integrationDefinitions.map((definition) => (
            <IntegrationCard key={`${definition.provider}:${byProvider.get(definition.provider)?.last_test_at ?? ''}`} definition={definition} row={byProvider.get(definition.provider)} canManage={can('integrations.manage')} />
          ))}
        </div>
      )}
    </Screen>
  );
}
