'use client';

import { formatPaise, rupeesToPaise, type RedemptionAmounts } from '@datapal/core';
import { Card, FormField, Input, useRpc, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { useDebounced } from '@/features/redeem/hooks/use-debounced';

export interface CalculatorInput {
  discountPercent: number;
  capPaise: number;
  minBillPaise: number;
}

/** Shows what a bill would cost the customer and the restaurant, using the same database maths as a real redemption. */
export function Calculator({ input }: { input: CalculatorInput }) {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [bill, setBill] = useState('1000');
  const paise = useDebounced(rupeesToPaise(Number(bill) || 0));
  const valid = input.discountPercent >= 1 && input.capPaise >= 1 && paise > 0;
  const result = useRpc<RedemptionAmounts>(
    'calculate_redemption',
    { p_restaurant_id: restaurant.id, p_discount_percent: input.discountPercent, p_cap_paise: input.capPaise, p_min_bill_paise: input.minBillPaise, p_bill_paise: paise },
    { enabled: valid },
  );
  const r = result.data;

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="font-heading text-h2 font-semibold text-ink">{t('rd.offers.calculator')}</h3>
      <FormField label={t('rd.offers.calc_bill')}>
        <Input type="number" min={0} value={bill} onChange={(e) => setBill(e.target.value)} />
      </FormField>
      {r?.below_minimum ? <p className="text-caption text-danger">{t('errors.bill_below_minimum')}</p> : null}
      <dl className="grid grid-cols-2 gap-1 text-body tabular-nums" aria-live="polite">
        <dt className="text-muted">{t('rd.offers.calc_discount')}</dt>
        <dd className="text-right text-ink">{r ? formatPaise(r.discount_paise) : '–'}</dd>
        <dt className="text-muted">{t('rd.offers.calc_customer_pays')}</dt>
        <dd className="text-right text-ink">{r ? formatPaise(r.customer_pays_paise) : '–'}</dd>
        <dt className="text-muted">{t('rd.offers.calc_fee')}</dt>
        <dd className="text-right text-ink">{r ? formatPaise(r.fee_paise) : '–'}</dd>
        <dt className="font-medium text-ink">{t('rd.offers.calc_keep')}</dt>
        <dd className="text-right font-medium text-green-900">{r ? formatPaise(r.restaurant_keeps_paise) : '–'}</dd>
      </dl>
    </Card>
  );
}
