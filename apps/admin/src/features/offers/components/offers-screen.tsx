'use client';

import { formatDateIst, formatPaise } from '@datapal/core';
import { Button, DataTable, EmptyState, ErrorState, PageHeader, Select, useRpc, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';

interface Row {
  id: string;
  title: string;
  status: string;
  discount_percent: number;
  discount_cap_paise: number;
  min_bill_paise: number;
  total_codes: number;
  codes_issued: number;
  ends_at: string;
  restaurant: string;
}

const statuses = ['pending_approval', 'active', 'paused', 'ended', 'rejected', 'draft'];

export function OffersScreen() {
  const t = useT();
  const can = useCan();
  const [status, setStatus] = useState('pending_approval');
  const query = useRpc<Row[]>('admin_offers', { p_status: status });
  const invalidate = { invalidate: [['rpc', 'admin_offers']], success: t('common.saved') };
  const review = useRpcMutation('review_offer', invalidate);
  const pause = useRpcMutation('admin_pause_offer', invalidate);
  const end = useRpcMutation('end_offer', invalidate);
  const manage = can('offers.manage');

  const columns: ColumnDef<Row, unknown>[] = [
    { header: t('sa.offers.restaurant'), accessorKey: 'restaurant' },
    { header: t('sa.offers.title'), accessorKey: 'title' },
    { header: t('sa.offers.discount'), cell: ({ row }) => `${row.original.discount_percent}% · ${formatPaise(Number(row.original.discount_cap_paise))}` },
    { header: t('sa.offers.min_bill'), cell: ({ row }) => formatPaise(Number(row.original.min_bill_paise)) },
    { header: t('sa.offers.codes'), cell: ({ row }) => `${row.original.codes_issued}/${row.original.total_codes}` },
    { header: t('sa.offers.ends'), cell: ({ row }) => formatDateIst(row.original.ends_at) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) =>
        manage ? (
          <div className="flex flex-wrap gap-2">
            {row.original.status === 'pending_approval' ? (
              <>
                <Button onClick={() => review.mutate({ p_offer_id: row.original.id, p_decision: 'approve' })}>{t('sa.restaurants.approve')}</Button>
                <Button variant="destructive" onClick={() => review.mutate({ p_offer_id: row.original.id, p_decision: 'reject' })}>
                  {t('sa.restaurants.reject')}
                </Button>
              </>
            ) : null}
            {row.original.status === 'active' ? (
              <Button variant="secondary" onClick={() => pause.mutate({ p_offer_id: row.original.id })}>
                {t('rd.offers.pause')}
              </Button>
            ) : null}
            {['active', 'paused'].includes(row.original.status) ? (
              <Button variant="destructive" onClick={() => end.mutate({ p_offer_id: row.original.id })}>
                {t('rd.offers.end')}
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ];

  return (
    <Screen permission="offers.view">
      <PageHeader
        title={t('sa.nav.offers')}
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
        <DataTable caption={t('sa.nav.offers')} columns={columns} rows={query.data ?? []} loading={query.isLoading} empty={<EmptyState icon={Tag} title={t('sa.offers.empty')} body={t('sa.offers.empty_body')} />} />
      )}
    </Screen>
  );
}
