'use client';

import { formatCount, formatDateIst, formatPaise, settingBoolean, type AppConfig } from '@datapal/core';
import { Button, DataTable, EmptyState, PageHeader, StatusChip, useRows, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { BoostDialog } from './boost-dialog';

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
}

export function BoostsScreen() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [creating, setCreating] = useState(false);
  const config = useRpc<AppConfig>('app_config', {});
  const rows = useRows<Boost[]>(['rows', 'boost_report', restaurant.id], (api) => api.from('boost_report').select('id, status, placement, starts_at, ends_at, price_paise, impressions, taps, codes_issued, redemptions').eq('restaurant_id', restaurant.id).order('starts_at', { ascending: false }) as never);
  const setState = useRpcMutation('set_boost_state', { invalidate: [['rows', 'boost_report']], success: t('common.saved') });
  const enabled = config.data ? settingBoolean(config.data, 'sponsored_enabled') : false;

  const columns: ColumnDef<Boost, unknown>[] = [
    { header: t('rd.boosts.placement'), cell: ({ row }) => (row.original.placement === 'feed' ? t('rd.boosts.placement_feed') : t('rd.boosts.placement_explore')) },
    { header: t('rd.boosts.dates'), cell: ({ row }) => `${formatDateIst(row.original.starts_at)} – ${formatDateIst(row.original.ends_at)}` },
    { header: t('rd.boosts.price'), cell: ({ row }) => formatPaise(Number(row.original.price_paise)) },
    { header: t('rd.boosts.impressions'), cell: ({ row }) => formatCount(row.original.impressions) },
    { header: t('rd.boosts.taps'), cell: ({ row }) => formatCount(row.original.taps) },
    { header: t('rd.boosts.codes'), cell: ({ row }) => formatCount(row.original.codes_issued) },
    { header: t('rd.boosts.redemptions'), cell: ({ row }) => formatCount(row.original.redemptions) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.status === 'active' ? (
            <Button variant="secondary" onClick={() => setState.mutate({ p_boost_id: row.original.id, p_state: 'paused' })}>
              {t('rd.offers.pause')}
            </Button>
          ) : null}
          {row.original.status === 'paused' ? <Button onClick={() => setState.mutate({ p_boost_id: row.original.id, p_state: 'active' })}>{t('rd.offers.resume')}</Button> : null}
          {['active', 'paused'].includes(row.original.status) ? (
            <Button variant="destructive" onClick={() => setState.mutate({ p_boost_id: row.original.id, p_state: 'ended' })}>
              {t('rd.offers.end')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.boosts.title')} actions={enabled ? <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setCreating(true)}>{t('rd.boosts.new')}</Button> : null} />
      {!enabled ? (
        <EmptyState icon={Megaphone} title={t('rd.boosts.unavailable_title')} body={t('rd.boosts.unavailable')} />
      ) : (
        <DataTable caption={t('rd.boosts.title')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={Megaphone} title={t('rd.boosts.empty_title')} body={t('rd.boosts.empty')} />} />
      )}
      <BoostDialog open={creating} onClose={() => setCreating(false)} />
    </RoleScreen>
  );
}
