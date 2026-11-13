'use client';

import { formatDateIst, formatPaise } from '@datapal/core';
import { Button, DataTable, EmptyState, ErrorState, PageHeader, StatusChip, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { OfferDialog } from './offer-dialog';

export interface OfferRow {
  id: string;
  title: string;
  status: string;
  discount_percent: number;
  discount_cap_paise: number;
  min_bill_paise: number;
  total_codes: number;
  codes_issued: number;
  starts_at: string;
  ends_at: string;
  drop_at: string | null;
  active_hours: { day: number; from: string; to: string }[];
  group_credit_cap: number;
  review_note: string | null;
}

export function OffersScreen() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [editing, setEditing] = useState<OfferRow | 'new' | null>(null);
  const offers = useRows<OfferRow[]>(['rows', 'offers', restaurant.id], (api) => api.from('offers').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }) as never);
  const options = { invalidate: [['rows', 'offers']], success: t('common.saved') };
  const submit = useRpcMutation('submit_offer', options);
  const pause = useRpcMutation('pause_offer', options);
  const end = useRpcMutation('end_offer', options);
  const duplicate = useRpcMutation('duplicate_offer', options);

  const columns: ColumnDef<OfferRow, unknown>[] = [
    { header: t('rd.offers.title_label'), accessorKey: 'title' },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    { header: t('sa.offers.discount'), cell: ({ row }) => `${row.original.discount_percent}% · ${formatPaise(Number(row.original.discount_cap_paise))}` },
    { header: t('sa.offers.codes'), cell: ({ row }) => t('rd.offers.issued', { issued: row.original.codes_issued, total: row.original.total_codes }) },
    { header: t('sa.offers.ends'), cell: ({ row }) => formatDateIst(row.original.ends_at) },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex flex-wrap gap-2">
            {o.status !== 'ended' ? (
              <Button variant="secondary" onClick={() => setEditing(o)}>
                {t('common.edit')}
              </Button>
            ) : null}
            {['draft', 'rejected'].includes(o.status) ? (
              <Button onClick={() => submit.mutate({ p_offer_id: o.id })}>{t('rd.offers.submit')}</Button>
            ) : null}
            {o.status === 'active' ? (
              <Button variant="secondary" onClick={() => pause.mutate({ p_offer_id: o.id })}>
                {t('rd.offers.pause')}
              </Button>
            ) : null}
            {o.status === 'paused' ? <Button onClick={() => submit.mutate({ p_offer_id: o.id })}>{t('rd.offers.resume')}</Button> : null}
            {['active', 'paused'].includes(o.status) ? (
              <Button variant="destructive" onClick={() => end.mutate({ p_offer_id: o.id })}>
                {t('rd.offers.end')}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => duplicate.mutate({ p_offer_id: o.id })}>
              {t('rd.offers.duplicate')}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.nav.offers')} actions={<Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEditing('new')}>{t('rd.offers.new')}</Button>} />
      {offers.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void offers.refetch()} />
      ) : (
        <DataTable
          caption={t('rd.nav.offers')}
          columns={columns}
          rows={offers.data ?? []}
          loading={offers.isLoading}
          empty={<EmptyState icon={Tag} title={t('rd.offers.empty_title')} body={t('rd.offers.empty_body')} action={<Button onClick={() => setEditing('new')}>{t('rd.offers.new')}</Button>} />}
        />
      )}
      <OfferDialog offer={editing} onClose={() => setEditing(null)} />
    </RoleScreen>
  );
}
