'use client';

import { DataTable, EmptyState, useRpc, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Trophy } from 'lucide-react';
import { useRestaurant } from '@/components/restaurant-context';

interface Promoter {
  referrer_id: string;
  name: string | null;
  handle: string | null;
  friends_redeemed: number;
  friends_released: number;
}

export function LeaderboardPanel() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const board = useRpc<Promoter[]>('get_leaderboard', { p_restaurant_id: restaurant.id, p_limit: 25 });
  const columns: ColumnDef<Promoter, unknown>[] = [
    { header: '#', cell: ({ row }) => row.index + 1 },
    { header: t('common.name'), cell: ({ row }) => row.original.name ?? '-' },
    { header: t('sa.users.handle'), cell: ({ row }) => row.original.handle ?? '-' },
    { header: t('rd.promoters.friends_redeemed'), accessorKey: 'friends_redeemed' },
    { header: t('rd.promoters.released'), accessorKey: 'friends_released' },
  ];
  return <DataTable caption={t('rd.promoters.leaderboard')} columns={columns} rows={board.data ?? []} loading={board.isLoading} empty={<EmptyState icon={Trophy} title={t('rd.promoters.empty_title')} body={t('rd.promoters.empty')} />} />;
}
