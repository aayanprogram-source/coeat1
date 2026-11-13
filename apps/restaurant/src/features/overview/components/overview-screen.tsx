'use client';

import { formatCount, formatPaise } from '@datapal/core';
import { Card, CardTitle, ErrorState, KpiCard, PageHeader, TrendChart, useApi, useRows, useT } from '@datapal/ui-web';
import { Banknote, Receipt, ShoppingBag, Star, UserPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { AlertsCard } from './alerts-card';
import { LiveFeed } from './live-feed';
import { TopDishes } from './top-dishes';

interface Day {
  day: string;
  redemptions: number;
  new_customers: number;
  avg_bill_paise: number;
  fee_paise: number;
}

const THIRTY_DAYS = 30 * 86_400_000;

export function OverviewScreen() {
  const t = useT();
  const api = useApi();
  const client = useQueryClient();
  const { restaurant } = useRestaurant();
  const since = new Date(Date.now() - THIRTY_DAYS).toISOString().slice(0, 10);
  const stats = useRows<Day[]>(['rows', 'daily', restaurant.id], (a) =>
    a.from('restaurant_daily_stats').select('day, redemptions, new_customers, avg_bill_paise, fee_paise').eq('restaurant_id', restaurant.id).gte('day', since).order('day') as never,
  );
  const rating = useRows<{ avg_rating: number | null } | null>(['rows', 'rating', restaurant.id], (a) =>
    a.from('restaurant_ratings').select('avg_rating').eq('restaurant_id', restaurant.id).maybeSingle() as never,
  );

  // New redemptions reach this screen as they happen, so the counter team and the owner see the same numbers.
  useEffect(() => {
    const channel = api
      .channel(`redemptions-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions', filter: `restaurant_id=eq.${restaurant.id}` }, () => {
        void client.invalidateQueries({ queryKey: ['rows', 'daily'] });
        void client.invalidateQueries({ queryKey: ['rpc', 'restaurant_recent_redemptions'] });
      })
      .subscribe();
    return () => {
      void api.removeChannel(channel);
    };
  }, [api, client, restaurant.id]);

  const days = stats.data ?? [];
  const total = (pick: (d: Day) => number) => days.reduce((sum, d) => sum + pick(d), 0);
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const feesThisMonth = days.filter((d) => d.day.startsWith(monthPrefix)).reduce((sum, d) => sum + Number(d.fee_paise), 0);
  const redemptions = total((d) => d.redemptions);
  const weightedBill = redemptions === 0 ? 0 : Math.round(days.reduce((sum, d) => sum + Number(d.avg_bill_paise) * d.redemptions, 0) / redemptions);
  const ready = stats.data !== undefined;

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.nav.overview')} />
      {stats.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void stats.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label={t('rd.overview.new_customers')} value={ready ? formatCount(total((d) => d.new_customers)) : null} icon={UserPlus} />
            <KpiCard label={t('rd.overview.redemptions')} value={ready ? formatCount(redemptions) : null} icon={Receipt} />
            <KpiCard label={t('rd.overview.avg_bill')} value={ready ? formatPaise(weightedBill) : null} icon={ShoppingBag} />
            <KpiCard label={t('rd.overview.fees_month')} value={ready ? formatPaise(feesThisMonth) : null} icon={Banknote} />
            <KpiCard label={t('rd.overview.avg_rating')} value={rating.data === undefined ? null : rating.data?.avg_rating ? String(rating.data.avg_rating) : '–'} icon={Star} />
          </div>
          <Card>
            <CardTitle className="mb-4">{t('rd.overview.chart_title')}</CardTitle>
            <TrendChart ariaLabel={t('rd.overview.chart_title')} data={days.map((d) => ({ label: d.day.slice(5), value: d.redemptions }))} />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <LiveFeed />
            <div className="flex flex-col gap-6">
              <AlertsCard />
              <TopDishes />
            </div>
          </div>
        </div>
      )}
    </RoleScreen>
  );
}
