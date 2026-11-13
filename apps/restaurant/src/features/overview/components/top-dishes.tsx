'use client';

import { Card, CardTitle, Skeleton, useRows, useT } from '@datapal/ui-web';
import { useRestaurant } from '@/components/restaurant-context';

interface Dish {
  menu_item_id: string;
  name: string;
  rating_count: number;
  avg_rating: number | null;
}

export function TopDishes() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const dishes = useRows<Dish[]>(['rows', 'top-dishes', restaurant.id], (a) =>
    a.from('restaurant_dish_ratings').select('menu_item_id, name, rating_count, avg_rating').eq('restaurant_id', restaurant.id).gt('rating_count', 0).order('rating_count', { ascending: false }).limit(5) as never,
  );

  return (
    <Card>
      <CardTitle className="mb-4">{t('rd.overview.top_dishes')}</CardTitle>
      {dishes.isLoading ? <Skeleton className="h-16 w-full" /> : null}
      {dishes.data?.length === 0 ? <p className="text-body text-muted">{t('rd.reviews.empty')}</p> : null}
      <ol className="flex flex-col gap-2">
        {(dishes.data ?? []).map((d) => (
          <li key={d.menu_item_id} className="flex justify-between text-body tabular-nums">
            <span className="truncate text-ink">{d.name}</span>
            <span className="text-muted">
              {d.avg_rating} · {d.rating_count}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
