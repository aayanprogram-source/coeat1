'use client';

import { formatPaise, type AppConfig, type BoostQuote } from '@datapal/core';
import { Button, Dialog, FormField, Input, Select, useRows, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';

interface ActiveOffer {
  id: string;
  title: string;
  codes_issued: number;
  total_codes: number;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : '');

/** The price from platform settings is shown before the restaurant confirms. */
export function BoostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [offerId, setOfferId] = useState('');
  const [placement, setPlacement] = useState<'feed' | 'explore'>('feed');
  const [cityId, setCityId] = useState(restaurant.city_id);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const config = useRpc<AppConfig>('app_config', {});
  const offers = useRows<ActiveOffer[]>(['rows', 'active-offers', restaurant.id], (api) => api.from('offers').select('id, title, codes_issued, total_codes').eq('restaurant_id', restaurant.id).eq('status', 'active') as never, open);
  const ready = starts !== '' && ends !== '' && new Date(ends) > new Date(starts) && cityId !== '';
  const quote = useRpc<BoostQuote>('quote_boost', { p_restaurant_id: restaurant.id, p_city: cityId, p_starts: toIso(starts), p_ends: toIso(ends) }, { enabled: open && ready });
  const create = useRpcMutation('create_boost', { invalidate: [['rows', 'boost_report']], success: t('rd.boosts.submitted') });
  const usable = (offers.data ?? []).filter((o) => o.codes_issued < o.total_codes);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={t('rd.boosts.new')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4">
        {offers.data && usable.length === 0 ? <p role="alert" className="text-body text-danger">{t('rd.boosts.needs_active_offer')}</p> : null}
        <FormField label={t('rd.boosts.offer')}>
          <Select value={offerId} onChange={(e) => setOfferId(e.target.value)}>
            <option value="">{t('common.none')}</option>
            {usable.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('rd.boosts.placement')}>
          <Select value={placement} onChange={(e) => setPlacement(e.target.value as 'feed' | 'explore')}>
            <option value="feed">{t('rd.boosts.placement_feed')}</option>
            <option value="explore">{t('rd.boosts.placement_explore')}</option>
          </Select>
        </FormField>
        <FormField label={t('rd.boosts.city')}>
          <Select value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {(config.data?.cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t('rd.offers.starts')}>
            <Input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </FormField>
          <FormField label={t('rd.offers.ends')}>
            <Input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </FormField>
        </div>
        <div className="rounded-card bg-mint-100 p-4 tabular-nums" aria-live="polite">
          <p className="text-caption text-muted">{t('rd.boosts.price')}</p>
          <p className="font-heading text-h1 font-semibold text-green-900">{quote.data ? formatPaise(quote.data.price_paise) : '–'}</p>
          {quote.data ? <p className="text-caption text-muted">{t('rd.boosts.price_breakdown', { days: quote.data.days, per_day: formatPaise(quote.data.per_day_paise) })}</p> : null}
          <p className="mt-1 text-caption text-muted">{t('rd.boosts.gst_note')}</p>
        </div>
        <Button
          disabled={!offerId || !quote.data}
          loading={create.isPending}
          onClick={() => create.mutate({ p_offer_id: offerId, p_placement: placement, p_city: cityId, p_starts: toIso(starts), p_ends: toIso(ends) }, { onSuccess: onClose })}
        >
          {t('rd.boosts.confirm')}
        </Button>
      </div>
    </Dialog>
  );
}
