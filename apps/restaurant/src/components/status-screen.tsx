'use client';

import { Card, useT } from '@datapal/ui-web';
import { Clock, ShieldOff } from 'lucide-react';
import { useRestaurant } from './restaurant-context';

/** Shown until the platform team approves the restaurant, and when a restaurant is suspended or rejected. */
export function StatusScreen() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const blocked = restaurant.status === 'suspended' || restaurant.status === 'rejected';
  const Icon = blocked ? ShieldOff : Clock;
  const title = restaurant.status === 'suspended' ? t('rd.onboarding.suspended_title') : restaurant.status === 'rejected' ? t('rd.onboarding.rejected_title') : t('rd.onboarding.pending_title');
  const body = restaurant.status === 'suspended' ? t('rd.onboarding.suspended_body') : restaurant.status === 'rejected' ? t('rd.onboarding.rejected_body') : t('rd.onboarding.pending_body');

  return (
    <Card className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 p-8 text-center">
      <Icon className="h-10 w-10 text-green-700" aria-hidden />
      <h1 className="font-heading text-h1 font-semibold text-ink">{title}</h1>
      <p className="text-body text-muted">{body}</p>
      {restaurant.review_note ? (
        <p className="w-full rounded-input bg-mint-100 p-3 text-left text-body text-ink">
          <span className="block text-caption font-medium text-muted">{t('rd.onboarding.review_note')}</span>
          {restaurant.review_note}
        </p>
      ) : null}
      {restaurant.status === 'pending' ? (
        <ul className="w-full list-disc pl-6 text-left text-body text-muted">
          <li>{t('rd.onboarding.review_details')}</li>
          <li>{t('rd.onboarding.review_menu')}</li>
          <li>{t('rd.onboarding.review_location')}</li>
        </ul>
      ) : null}
    </Card>
  );
}
