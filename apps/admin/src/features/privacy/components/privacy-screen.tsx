'use client';

import { formatDateIst } from '@datapal/core';
import { Button, DataTable, EmptyState, PageHeader, Tabs, useRows, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck } from 'lucide-react';
import { useCan } from '@/components/admin-context';
import { EntityManager } from '@/components/entity-manager';
import { Screen } from '@/components/screen';
import { breachEntity } from '@/features/master-data/entities';

interface Request {
  id: string;
  kind: string;
  status: string;
  due_at: string;
  created_at: string;
  user_id: string | null;
}

function RequestsPanel() {
  const t = useT();
  const can = useCan();
  const rows = useRows<Request[]>(['rows', 'data_requests'], (api) => api.from('data_requests').select('id, kind, status, due_at, created_at, user_id').order('due_at'));
  const fulfil = useRpcMutation('fulfil_data_request', { invalidate: [['rows', 'data_requests']], success: t('common.saved') });
  const columns: ColumnDef<Request>[] = [
    { header: t('sa.privacy.kind'), accessorKey: 'kind' },
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
    { header: t('sa.data_requests.due', { date: '' }).trim(), cell: ({ row }) => formatDateIst(row.original.due_at) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) =>
        can('data_requests.manage') && row.original.status === 'open' ? (
          <div className="flex gap-2">
            <Button onClick={() => fulfil.mutate({ p_request_id: row.original.id, p_status: 'fulfilled' })}>{t('sa.data_requests.fulfil')}</Button>
            <Button variant="ghost" onClick={() => fulfil.mutate({ p_request_id: row.original.id, p_status: 'rejected' })}>
              {t('sa.restaurants.reject')}
            </Button>
          </div>
        ) : null,
    },
  ];
  return <DataTable caption={t('sa.data_requests.title')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={ShieldCheck} title={t('sa.privacy.empty')} body={t('sa.privacy.empty_body')} />} />;
}

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
