'use client';

import { formatDateIst } from '@datapal/core';
import { Card, CardTitle, DataTable, EmptyState, PageHeader, TrendChart, useRows, useRpc, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { ReportReviewDialog } from './report-review-dialog';
import { RecentRatings } from './recent-ratings';

interface Dish {
  menu_item_id: string;
  name: string;
  rating_count: number;
  avg_rating: number | null;
  verified_count: number;
}
interface Trend {
  day: string;
  avg_rating: number;
  ratings: number;
}

export function ReviewsScreen() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [reporting, setReporting] = useState<string | null>(null);
  const dishes = useRows<Dish[]>(['rows', 'dish-ratings', restaurant.id], (api) => api.from('restaurant_dish_ratings').select('menu_item_id, name, rating_count, avg_rating, verified_count').eq('restaurant_id', restaurant.id).order('rating_count', { ascending: false }) as never);
  const trend = useRpc<Trend[]>('restaurant_rating_trend', { p_restaurant_id: restaurant.id, p_days: 90 });

  const columns: ColumnDef<Dish>[] = [
    { header: t('rd.reviews.dish'), accessorKey: 'name' },
    { header: t('rd.overview.avg_rating'), cell: ({ row }) => row.original.avg_rating ?? '–' },
    { header: t('rd.reviews.ratings'), accessorKey: 'rating_count' },
    { header: t('common.verified_diner'), accessorKey: 'verified_count' },
  ];

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.nav.reviews')} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle className="mb-4">{t('rd.reviews.trend')}</CardTitle>
          {trend.data?.length === 0 ? <p className="text-body text-muted">{t('rd.reviews.empty')}</p> : <TrendChart ariaLabel={t('rd.reviews.trend')} data={(trend.data ?? []).map((d) => ({ label: formatDateIst(d.day, { year: undefined }), value: d.avg_rating }))} />}
        </Card>
        <section>
          <h2 className="mb-2 font-heading text-h2 font-semibold text-ink">{t('rd.reviews.by_dish')}</h2>
          <DataTable caption={t('rd.reviews.by_dish')} columns={columns} rows={dishes.data ?? []} loading={dishes.isLoading} empty={<EmptyState icon={Star} title={t('rd.reviews.empty_title')} body={t('rd.reviews.empty')} />} />
        </section>
        <RecentRatings onReport={setReporting} />
      </div>
      <ReportReviewDialog storyId={reporting} onClose={() => setReporting(null)} />
    </RoleScreen>
  );
}
