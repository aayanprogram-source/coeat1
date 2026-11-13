'use client';

import { formatDateIst } from '@datapal/core';
import { Button, DataTable, EmptyState, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Gift } from 'lucide-react';
import { useRestaurant } from '@/components/restaurant-context';

interface Pending {
  id: string;
  label: string;
  customer: string;
  claimed_at: string | null;
  created_at: string;
}

export function PendingRewardsPanel() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const pending = useRpc<Pending[]>('restaurant_pending_rewards', { p_restaurant_id: restaurant.id });
  const use = useRpcMutation('mark_reward_used', { invalidate: [['rpc', 'restaurant_pending_rewards']], success: t('common.saved') });
  const columns: ColumnDef<Pending>[] = [
    { header: t('rd.redeem.customer'), accessorKey: 'customer' },
    { header: t('rd.promoters.reward_type'), accessorKey: 'label' },
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
    { header: t('common.status'), cell: ({ row }) => (row.original.claimed_at ? t('rd.promoters.claimed') : t('rd.promoters.unclaimed')) },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <Button variant="secondary" loading={use.isPending && use.variables.p_reward_id === row.original.id} onClick={() => use.mutate({ p_reward_id: row.original.id })}>
          {t('rd.promoters.mark_used')}
        </Button>
      ),
    },
  ];
  return <DataTable caption={t('rd.promoters.awaiting')} columns={columns} rows={pending.data ?? []} loading={pending.isLoading} empty={<EmptyState icon={Gift} title={t('rd.promoters.none_awaiting_title')} body={t('rd.promoters.none_awaiting')} />} />;
}
