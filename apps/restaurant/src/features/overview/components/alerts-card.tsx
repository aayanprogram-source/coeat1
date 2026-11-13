'use client';

import { Card, CardTitle, Skeleton, useRpc, useT } from '@datapal/ui-web';
import { AlertTriangle, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useRestaurant } from '@/components/restaurant-context';

interface Alerts {
  low_codes: { id: string; title: string; remaining: number }[];
  flagged: number;
}

export function AlertsCard() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const alerts = useRpc<Alerts>('restaurant_alerts', { p_restaurant_id: restaurant.id });
  const lines = alerts.data ? [...alerts.data.low_codes.map((o) => t('rd.overview.low_codes', { title: o.title, count: o.remaining })), ...(alerts.data.flagged > 0 ? [t('rd.overview.flagged')] : [])] : [];

  return (
    <Card>
      <CardTitle className="mb-4">{t('rd.overview.alerts')}</CardTitle>
      {alerts.isLoading ? <Skeleton className="h-10 w-full" /> : null}
      {alerts.data && lines.length === 0 ? (
        <p className="flex items-center gap-2 text-body text-muted">
          <CircleCheck className="h-5 w-5 text-success" aria-hidden /> {t('rd.overview.no_alerts')}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-body text-ink">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-coral-500" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {alerts.data && alerts.data.low_codes.length > 0 ? (
        <Link href="/offers" className="mt-3 inline-block text-caption text-green-700 underline">
          {t('rd.nav.offers')}
        </Link>
      ) : null}
    </Card>
  );
}
