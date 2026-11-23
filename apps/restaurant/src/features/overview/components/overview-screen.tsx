'use client';

import { formatCount, formatPaise } from '@datapal/core';
import { Card, CardTitle, ErrorState, KpiCard, TrendChart, useApi, useRows, useT } from '@datapal/ui-web';
import { Banknote, Receipt, ScanLine, ShoppingBag, Star, Tag, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'rd.overview.greeting_morning' as const;
  return hour < 17 ? ('rd.overview.greeting_afternoon' as const) : ('rd.overview.greeting_evening' as const);
}

export function OverviewScreen() {
  const t = useT();
  const api = useApi();
  const client = useQueryClient();
  const { restaurant } = useRestaurant();
  const [since] = useState(() => new Date(Date.now() - THIRTY_DAYS).toISOString().slice(0, 10));
  const stats = useRows<Day[]>(['rows', 'daily', restaurant.id], (a) =>
    a.from('restaurant_daily_stats').select('day, redemptions, new_customers, avg_bill_paise, fee_paise').eq('restaurant_id', restaurant.id).gte('day', since).order('day') as never,
  );
  const rating = useRows<{ avg_rating: number | null } | null>(['rows', 'rating', restaurant.id], (a) =>
    a.from('restaurant_ratings').select('avg_rating').eq('restaurant_id', restaurant.id).maybeSingle(),
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
  const feesThisMonth = days.filter((d) => d.day.startsWith(monthPrefix)).reduce((sum, d) => sum + d.fee_paise, 0);
  const redemptions = total((d) => d.redemptions);
  const weightedBill = redemptions === 0 ? 0 : Math.round(days.reduce((sum, d) => sum + d.avg_bill_paise * d.redemptions, 0) / redemptions);
  const ready = stats.data !== undefined;

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <section className="page-enter relative mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#E8512F] via-[#CB3C1B] to-[#8E2A12] p-8 text-white shadow-[0_24px_60px_-24px_rgba(203,60,27,0.8)]">
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-accent/25 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{t(greetingKey())}</p>
            <h1 className="mt-1 font-heading text-[36px] font-extrabold leading-tight tracking-tight">{restaurant.name}</h1>
            <p className="mt-2 max-w-md text-[15px] text-white/85">{t('rd.overview.hero_body', { name: restaurant.name })}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/redeem" className="inline-flex min-h-[46px] items-center gap-2 rounded-button bg-white px-5 text-[14.5px] font-semibold text-primary shadow-low transition duration-base hover:-translate-y-px">
              <ScanLine className="h-4 w-4" aria-hidden />
              {t('rd.overview.hero_redeem')}
            </Link>
            <Link href="/offers" className="inline-flex min-h-[46px] items-center gap-2 rounded-button border border-white/30 bg-white/10 px-5 text-[14.5px] font-semibold text-white transition duration-base hover:bg-white/20">
              <Tag className="h-4 w-4" aria-hidden />
              {t('rd.overview.hero_offers')}
            </Link>
          </div>
        </div>
      </section>
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
