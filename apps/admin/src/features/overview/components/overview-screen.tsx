'use client';

import { formatCount, formatPaise } from '@datapal/core';
import { ErrorState, KpiCard, PageHeader, useRows, useT } from '@datapal/ui-web';
import { Banknote, Building2, CheckCheck, Clock, Flag, Repeat, ShieldAlert, Store, Utensils } from 'lucide-react';
import { Screen } from '@/components/screen';

interface Analytics {
  stories_posted: number;
  codes_issued: number;
  redemptions_verified: number;
  avg_hours_to_redeem: number;
  repeat_visits: number;
  active_restaurants: number;
  fees_accrued_paise: number;
  fees_collected_paise: number;
  open_fraud_flags: number;
  open_data_requests: number;
}

export function OverviewScreen() {
  const t = useT();
  const query = useRows<Analytics | null>(['analytics'], (api) => api.from('platform_analytics').select('*').maybeSingle() as never);
  const a = query.data;
  const value = (n: number | undefined, f: (v: number) => string = formatCount) => (a && n !== undefined ? f(n) : null);

  return (
    <Screen permission="overview.view">
      <PageHeader title={t('sa.nav.overview')} />
      {query.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label={t('sa.overview.stories')} value={value(a?.stories_posted)} icon={Utensils} />
          <KpiCard label={t('sa.overview.codes_issued')} value={value(a?.codes_issued)} icon={Store} />
          <KpiCard label={t('sa.overview.redeemed')} value={value(a?.redemptions_verified)} icon={CheckCheck} />
          <KpiCard label={t('sa.overview.speed')} value={value(a?.avg_hours_to_redeem, (v) => `${v} h`)} icon={Clock} hint={t('sa.overview.speed_hint')} />
          <KpiCard label={t('sa.overview.repeat')} value={value(a?.repeat_visits)} icon={Repeat} />
          <KpiCard label={t('sa.overview.restaurants')} value={value(a?.active_restaurants)} icon={Building2} />
          <KpiCard label={t('sa.overview.accrued')} value={value(a?.fees_accrued_paise, formatPaise)} icon={Banknote} />
          <KpiCard label={t('sa.overview.collected')} value={value(a?.fees_collected_paise, formatPaise)} icon={Banknote} />
          <KpiCard label={t('sa.overview.fraud')} value={value(a?.open_fraud_flags)} icon={ShieldAlert} />
          <KpiCard label={t('sa.overview.requests')} value={value(a?.open_data_requests)} icon={Flag} />
        </div>
      )}
    </Screen>
  );
}
