'use client';

import type { AppConfig, WeeklyHours } from '@datapal/core';
import { PageHeader, Skeleton, Stepper, useApi, useRows, useRpc, useT } from '@datapal/ui-web';
import { useState } from 'react';
import type { MyRestaurant } from '@/components/restaurant-context';
import { AgreementStep } from './agreement-step';
import { DetailsStep, type DetailsValues } from './details-step';
import { HoursStep } from './hours-step';
import { MediaStep } from './media-step';
import { MenuStep } from './menu-step';
import { SubmitStep } from './submit-step';

interface Draft extends DetailsValues {
  id: string;
  hours: WeeklyHours;
  logo_path: string | null;
  cover_path: string | null;
}

const blank: DetailsValues = { name: '', city_id: '', cuisine_ids: [], address: '', lat: 0, lng: 0, phone: '+91', upi_id: '' };

export function OnboardingScreen() {
  const t = useT();
  const api = useApi();
  const [step, setStep] = useState(0);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const config = useRpc<AppConfig>('app_config', {});
  const mine = useRpc<MyRestaurant[]>('my_restaurants', {});
  const existing = mine.data?.find((r) => r.status === 'draft' || r.status === 'rejected');
  const restaurantId = createdId ?? existing?.id ?? null;
  const draft = useRows<Draft | null>(['rows', 'onboarding-draft', restaurantId], (a) => a.from('restaurants').select('id, name, city_id, cuisine_ids, address, lat, lng, phone, upi_id, hours, logo_path, cover_path').eq('id', restaurantId ?? '').maybeSingle() as never, restaurantId !== null);
  const steps = [t('rd.onboarding.step_details'), t('rd.onboarding.step_hours'), t('rd.onboarding.step_media'), t('rd.onboarding.step_menu'), t('rd.onboarding.step_agreement'), t('rd.onboarding.step_review')];
  const next = () => setStep((s) => s + 1);
  const url = (bucket: string, path: string | null) => (path ? api.storage.from(bucket).getPublicUrl(path).data.publicUrl : null);

  const loading = config.isLoading || mine.isLoading || (restaurantId !== null && draft.isLoading);
  const d = draft.data;
  const initial: DetailsValues = d ? { name: d.name, city_id: d.city_id, cuisine_ids: d.cuisine_ids, address: d.address, lat: d.lat, lng: d.lng, phone: d.phone, upi_id: d.upi_id } : blank;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageHeader title={t('rd.onboarding.title')} />
      <div className="mb-6">
        <Stepper steps={steps} current={step} />
      </div>
      {loading || !config.data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {step === 0 ? <DetailsStep key={restaurantId ?? 'new'} config={config.data} restaurantId={restaurantId} initial={initial} onSaved={(id) => { setCreatedId(id); next(); }} /> : null}
          {step === 1 && restaurantId ? <HoursStep restaurantId={restaurantId} initial={d?.hours ?? {}} onSaved={next} /> : null}
          {step === 2 && restaurantId ? <MediaStep restaurantId={restaurantId} logoUrl={url('restaurant-media', d?.logo_path ?? null)} coverUrl={url('restaurant-media', d?.cover_path ?? null)} onSaved={next} /> : null}
          {step === 3 && restaurantId ? <MenuStep restaurantId={restaurantId} onSaved={next} /> : null}
          {step === 4 && restaurantId ? <AgreementStep restaurantId={restaurantId} onSaved={next} /> : null}
          {step === 5 && restaurantId ? <SubmitStep restaurantId={restaurantId} /> : null}
        </>
      )}
    </main>
  );
}
