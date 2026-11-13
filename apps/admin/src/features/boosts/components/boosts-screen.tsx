'use client';

import { formatDateIst, formatPaise, formatCount } from '@datapal/core';
import { Button, DataTable, EmptyState, ErrorState, PageHeader, Select, useRpc, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';

interface Boost {
  id: string;
  status: string;
  placement: string;
  starts_at: string;
  ends_at: string;
  price_paise: number;
  impressions: number;
  taps: number;
  codes_issued: number;
  redemptions: number;
  charged_paise: number;
  restaurant: string;
  city: string;
  offer: string;
}

export function BoostsScreen() {
  const t = useT();
  const can = useCan();
  const [status, setStatus] = useState('pending_approval');
  const query = useRpc<Boost[]>('admin_boosts', { p_status: status || undefined });
  const options = { invalidate: [['rpc', 'admin_boosts']], success: t('common.saved') };
  const review = useRpcMutation('approve_boost', options);
  const setState = useRpcMutation('set_boost_state', options);
  const manage = can('boosts.manage');

  const columns: ColumnDef<Boost, unknown>[] = [
    { header: t('sa.offers.restaurant'), accessorKey: 'restaurant' },
    { header: t('rd.boosts.offer'), accessorKey: 'offer' },
    { header: t('rd.boosts.city'), accessorKey: 'city' },
    { header: t('rd.boosts.placement'), accessorKey: 'placement' },
    { header: t('rd.boosts.dates'), cell: ({ row }) => `${formatDateIst(row.original.starts_at)} – ${formatDateIst(row.original.ends_at)}` },
    { header: t('rd.boosts.impressions'), cell: ({ row }) => formatCount(row.original.impressions) },
    { header: t('rd.boosts.taps'), cell: ({ row }) => formatCount(row.original.taps) },
    { header: t('rd.boosts.redemptions'), cell: ({ row }) => formatCount(row.original.redemptions) },
    { header: t('sa.boosts.revenue'), cell: ({ row }) => formatPaise(Number(row.original.charged_paise)) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) =>
        manage ? (
          <div className="flex flex-wrap gap-2">
            {row.original.status === 'pending_approval' ? (
              <>
                <Button onClick={() => review.mutate({ p_boost_id: row.original.id, p_decision: 'approve' })}>{t('sa.restaurants.approve')}</Button>
                <Button variant="destructive" onClick={() => review.mutate({ p_boost_id: row.original.id, p_decision: 'reject' })}>
                  {t('sa.restaurants.reject')}
                </Button>
              </>
            ) : null}
            {row.original.status === 'active' ? (
              <Button variant="secondary" onClick={() => setState.mutate({ p_boost_id: row.original.id, p_state: 'paused' })}>
                {t('rd.offers.pause')}
              </Button>
            ) : null}
            {['active', 'paused'].includes(row.original.status) ? (
              <Button variant="destructive" onClick={() => setState.mutate({ p_boost_id: row.original.id, p_state: 'ended' })}>
                {t('rd.offers.end')}
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ];

  return (
    <Screen permission="boosts.view">
      <PageHeader
        title={t('sa.nav.boosts')}
        description={t('sa.boosts.intro')}
        actions={
          <Select aria-label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {['pending_approval', 'active', 'paused', 'ended', 'rejected'].map((s) => (
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
        <DataTable caption={t('sa.nav.boosts')} columns={columns} rows={query.data ?? []} loading={query.isLoading} empty={<EmptyState icon={Megaphone} title={t('sa.boosts.empty')} body={t('sa.boosts.empty_body')} />} />
      )}
    </Screen>
  );
}
