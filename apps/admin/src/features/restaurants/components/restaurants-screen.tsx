'use client';

import { formatDateIst } from '@datapal/core';
import { DataTable, EmptyState, ErrorState, PageHeader, Select, useRpc, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { Screen } from '@/components/screen';
import { RestaurantDialog } from './restaurant-dialog';

interface Row {
  id: string;
  name: string;
  status: string;
  fee_percent: number;
  created_at: string;
  city: string;
}

const statuses = ['pending', 'approved', 'suspended', 'rejected', 'draft'];

export function RestaurantsScreen() {
  const t = useT();
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState<string | null>(null);
  const query = useRpc<Row[]>('admin_restaurants', { p_status: status });

  const columns: ColumnDef<Row>[] = [
    { header: t('common.name'), accessorKey: 'name' },
    { header: t('sa.restaurants.city'), accessorKey: 'city' },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    { header: t('sa.restaurants.fee'), cell: ({ row }) => `${row.original.fee_percent}%` },
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
  ];

  return (
    <Screen permission="restaurants.view">
      <PageHeader
        title={t('sa.restaurants.queue')}
        actions={
          <Select aria-label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
        }
      />
      {query.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
      ) : (
        <DataTable
          caption={t('sa.restaurants.queue')}
          columns={columns}
          rows={query.data ?? []}
          loading={query.isLoading}
          onRowClick={(row) => setSelected(row.id)}
          empty={<EmptyState icon={Building2} title={t('sa.restaurants.empty')} body={t('sa.restaurants.empty_body')} />}
        />
      )}
      <RestaurantDialog restaurantId={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}
