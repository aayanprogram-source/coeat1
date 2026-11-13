'use client';

import { formatPaise, rupeesToPaise, type LookupResult, type RedemptionAmounts } from '@datapal/core';
import { Button, Card, FormField, Input, useRpc, useT } from '@datapal/ui-web';
import { Camera } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { useDebounced } from '../hooks/use-debounced';

type Found = Extract<LookupResult, { ok: true }>;

export interface BillFormProps {
  found: Found;
  amount: string;
  onAmount: (value: string) => void;
  photo: File | null;
  onPhoto: (file: File | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function BillForm({ found, amount, onAmount, photo, onPhoto, onConfirm, onCancel, busy }: BillFormProps) {
  const t = useT();
  const { restaurant } = useRestaurant();
  const input = useRef<HTMLInputElement>(null);
  const bill = useDebounced(rupeesToPaise(Number(amount) || 0));
  const preview = useRpc<RedemptionAmounts>('preview_redemption', { p_restaurant_id: restaurant.id, p_offer_id: found.offer.id, p_bill_paise: bill }, { enabled: bill > 0 });

  useEffect(() => {
    input.current?.focus();
  }, []);

  const shown = preview.data;
  const below = shown?.below_minimum === true;
  const ready = bill > 0 && shown !== undefined && !below;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1">
        <p className="text-caption text-muted">{t('rd.redeem.customer')}</p>
        <p className="font-heading text-h2 font-semibold text-ink">{found.customer_name ?? '-'}</p>
        <p className="text-caption text-muted">{t('rd.redeem.offer')}</p>
        <p className="text-body text-ink">{found.offer.title}</p>
        <p className="text-caption text-muted tabular-nums">
          {t('common.off', { percent: found.offer.discount_percent })} · {t('common.upto', { amount: formatPaise(found.offer.discount_cap_paise) })} ·{' '}
          {t('common.min_bill', { amount: formatPaise(found.offer.min_bill_paise) })}
        </p>
      </Card>
      <FormField label={t('rd.redeem.bill_label')}>
        <Input
          ref={input}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ready) onConfirm();
          }}
          className="h-16 text-[32px] tabular-nums"
        />
      </FormField>
      <div aria-live="polite" className="rounded-card bg-mint-100 p-4 tabular-nums">
        {below ? (
          <p role="alert" className="text-body text-danger">
            {t('errors.bill_below_minimum')}
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-1 text-body">
            <dt className="text-muted">{t('rd.redeem.discount')}</dt>
            <dd className="text-right font-medium text-ink">{shown ? formatPaise(shown.discount_paise) : '–'}</dd>
            <dt className="text-muted">{t('rd.redeem.to_collect')}</dt>
            <dd className="text-right font-heading text-h2 font-semibold text-green-900">{shown ? formatPaise(shown.customer_pays_paise) : '–'}</dd>
          </dl>
        )}
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-body text-ink">
        <Camera className="h-5 w-5" aria-hidden />
        {photo ? photo.name : t('rd.redeem.bill_photo')}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
      </label>
      <div className="flex gap-3">
        <Button className="flex-1" disabled={!ready} loading={busy} onClick={onConfirm}>
          {t('rd.redeem.confirm')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
