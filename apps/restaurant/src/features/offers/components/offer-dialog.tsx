'use client';

import { formatPaise, rupeesToPaise } from '@datapal/core';
import { Button, CodeCard, Dialog, FormField, Input, Skeleton, useRpcMutation, useT } from '@datapal/ui-web';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRestaurant } from '@/components/restaurant-context';
import { useOfferBounds } from '../hooks/use-offer-bounds';
import { emptyOffer, fromOffer, offerResolver, toPayload, type OfferFormValues } from '../offer-form-model';
import { Calculator } from './calculator';
import { HoursEditor } from './hours-editor';
import type { OfferRow } from './offers-screen';

export function OfferDialog({ offer, onClose }: { offer: OfferRow | 'new' | null; onClose: () => void }) {
  const t = useT();
  const { restaurant } = useRestaurant();
  const bounds = useOfferBounds();
  const save = useRpcMutation('save_offer', { invalidate: [['rows', 'offers']], success: t('common.saved') });
  const submit = useRpcMutation('submit_offer', { invalidate: [['rows', 'offers']], success: t('common.saved') });
  const form = useForm<OfferFormValues>({ resolver: bounds ? offerResolver(bounds) : undefined, defaultValues: emptyOffer(3) });
  const values = form.watch();
  const errors = form.formState.errors;

  useEffect(() => {
    if (!offer || !bounds) return;
    form.reset(offer === 'new' ? emptyOffer(bounds.groupCreditCapDefault) : fromOffer(offer));
  }, [offer, bounds, form]);

  const run = (andSubmit: boolean) =>
    form.handleSubmit(async (v) => {
      const id = await save.mutateAsync({ p_restaurant_id: restaurant.id, p_id: offer !== 'new' && offer ? offer.id : undefined, p_data: toPayload(v) });
      if (andSubmit && typeof id === 'string') await submit.mutateAsync({ p_offer_id: id });
      onClose();
    })();

  const range = (min: string, max: string) => t('rd.offers.bounds', { min, max });
  const number = (name: 'discountPercent' | 'capInr' | 'minBillInr' | 'totalCodes' | 'groupCreditCap') => form.register(name, { valueAsNumber: true });
  const err = (name: keyof OfferFormValues) => (errors[name] ? (errors[name].message ?? t('common.invalid_value')) : undefined);

  return (
    <Dialog open={offer !== null} onOpenChange={(o) => !o && onClose()} title={offer === 'new' ? t('rd.offers.new') : t('rd.offers.edit')} closeLabel={t('common.close')}>
      {!bounds ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          <FormField label={t('rd.offers.title_label')} error={err('title')}>
            <Input {...form.register('title')} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('rd.offers.discount_percent')} hint={range('1', String(bounds.maxDiscountPercent))} error={err('discountPercent')}>
              <Input type="number" {...number('discountPercent')} />
            </FormField>
            <FormField label={t('rd.offers.discount_cap')} hint={range('1', String(bounds.maxDiscountCapPaise / 100))} error={err('capInr')}>
              <Input type="number" {...number('capInr')} />
            </FormField>
            <FormField label={t('rd.offers.min_bill')} hint={range(String(bounds.minBillFloorPaise / 100), '∞')} error={err('minBillInr')}>
              <Input type="number" {...number('minBillInr')} />
            </FormField>
            <FormField label={t('rd.offers.total_codes')} hint={range('1', String(bounds.maxCodesPerOffer))} error={err('totalCodes')}>
              <Input type="number" {...number('totalCodes')} />
            </FormField>
            <FormField label={t('rd.offers.starts')} error={err('startsAt')}>
              <Input type="datetime-local" {...form.register('startsAt')} />
            </FormField>
            <FormField label={t('rd.offers.ends')} error={err('endsAt')}>
              <Input type="datetime-local" {...form.register('endsAt')} />
            </FormField>
            <FormField label={t('rd.offers.drop')} hint={t('rd.offers.drop_help')} error={err('dropAt')}>
              <Input type="datetime-local" {...form.register('dropAt')} />
            </FormField>
            <FormField label={t('rd.offers.group_cap')} hint={range('1', String(bounds.groupCreditCapMax))} error={err('groupCreditCap')}>
              <Input type="number" {...number('groupCreditCap')} />
            </FormField>
          </div>
          <FormField label={t('rd.offers.active_hours')} hint={t('rd.offers.active_hours_help')}>
            <Controller control={form.control} name="activeHours" render={({ field }) => <HoursEditor value={field.value} onChange={field.onChange} />} />
          </FormField>
          <Calculator input={{ discountPercent: values.discountPercent, capPaise: rupeesToPaise(values.capInr), minBillPaise: rupeesToPaise(values.minBillInr) }} />
          <div>
            <p className="mb-2 text-caption font-medium text-ink">{t('rd.offers.preview')}</p>
            <CodeCard
              restaurantName={restaurant.name}
              logoUrl={null}
              offerLine={`${t('common.off', { percent: values.discountPercent })} · ${t('common.upto', { amount: formatPaise(rupeesToPaise(values.capInr)) })}`}
              minBillPaise={rupeesToPaise(values.minBillInr)}
              code="0000"
              qrValue={restaurant.id}
              remaining={values.totalCodes}
              total={values.totalCodes}
              msRemaining={72 * 3_600_000}
              labels={{ minBill: t('common.min_bill', { amount: '{amount}' }), codesLeft: t('common.codes_left', { count: '{count}' }), firstTimeOnly: t('common.first_time_only'), qr: t('rd.redeem.scan') }}
            />
            <p className="mt-2 text-center text-caption text-muted">{t('rd.offers.preview_note')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={save.isPending} onClick={() => void run(false)}>
              {t('rd.offers.save_draft')}
            </Button>
            <Button loading={save.isPending || submit.isPending} onClick={() => void run(true)}>
              {t('rd.offers.submit')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
