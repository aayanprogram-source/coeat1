'use client';

import { formatPaise, formatTimeIst } from '@datapal/core';
import { Card, CardTitle, EmptyState, Skeleton, StatusChip, useRpc, useT } from '@datapal/ui-web';
import { Receipt } from 'lucide-react';
import { useRestaurant } from '@/components/restaurant-context';

interface Entry {
  id: string;
  status: string;
  bill_paise: number;
  discount_paise: number;
  created_at: string;
  customer_name: string;
  offer_title: string;
}

export function LiveFeed() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const feed = useRpc<Entry[]>('restaurant_recent_redemptions', { p_restaurant_id: restaurant.id, p_limit: 12 });

  return (
    <Card>
      <CardTitle className="mb-4">{t('rd.overview.live_feed')}</CardTitle>
      {feed.isLoading ? <Skeleton className="h-24 w-full" /> : null}
      {feed.data?.length === 0 ? <EmptyState icon={Receipt} title={t('rd.overview.empty_feed_title')} body={t('rd.overview.empty_feed')} /> : null}
      <ul className="flex flex-col divide-y divide-line">
        {(feed.data ?? []).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-body text-ink">{e.customer_name}</p>
              <p className="truncate text-caption text-muted">
                {e.offer_title} · {formatTimeIst(e.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-body text-ink">{formatPaise(Number(e.bill_paise))}</span>
              <StatusChip status={e.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
