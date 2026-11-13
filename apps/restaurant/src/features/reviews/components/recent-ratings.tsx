'use client';

import { formatDateIst } from '@datapal/core';
import { Button, Card, Chip, Skeleton, useRpc, useT } from '@datapal/ui-web';
import { Star } from 'lucide-react';
import { useRestaurant } from '@/components/restaurant-context';

interface Rating {
  id: string;
  rating: number;
  created_at: string;
  dish: string;
  author: string;
  story_id: string;
}

export function RecentRatings({ onReport }: { onReport: (storyId: string) => void }) {
  const t = useT();
  const { restaurant } = useRestaurant();
  const ratings = useRpc<Rating[]>('restaurant_recent_ratings', { p_restaurant_id: restaurant.id, p_limit: 20 });

  return (
    <section>
      <h2 className="mb-2 font-heading text-h2 font-semibold text-ink">{t('rd.reviews.recent')}</h2>
      {ratings.isLoading ? <Skeleton className="h-24 w-full" /> : null}
      <ul className="flex flex-col gap-2">
        {(ratings.data ?? []).map((r) => (
          <li key={r.id}>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body text-ink">
                  {r.dish} · <span className="inline-flex items-center gap-1 tabular-nums">{r.rating}<Star className="h-4 w-4 text-saffron-500" aria-label={t('rd.reviews.stars')} /></span>
                </p>
                <p className="text-caption text-muted">
                  {r.author} · {formatDateIst(r.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone="success">{t('common.verified_diner')}</Chip>
                <Button variant="ghost" onClick={() => onReport(r.story_id)}>
                  {t('rd.reviews.report')}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
