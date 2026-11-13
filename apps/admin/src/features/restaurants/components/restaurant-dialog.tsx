'use client';

import { formatPaise, settingNumber, type AppConfig } from '@datapal/core';
import { Button, Checkbox, Dialog, FormField, Input, Skeleton, Textarea, useRpc, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';

interface Overview {
  restaurant: { id: string; name: string; status: string; address: string; phone: string; fee_percent: number; review_note: string | null };
  owner_email: string;
  menu_items: number;
  offers: { id: string; title: string; status: string; codes_issued: number; total_codes: number }[];
  verified_redemptions: number;
  fees_paise: number;
}

const checks = ['sa.restaurants.check_location', 'sa.restaurants.check_menu', 'sa.restaurants.check_media', 'sa.restaurants.check_agreement'] as const;

export function RestaurantDialog({ restaurantId, onClose }: { restaurantId: string | null; onClose: () => void }) {
  const t = useT();
  const can = useCan();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [fee, setFee] = useState('');
  const id = restaurantId ?? '';
  const overview = useRpc<Overview>('admin_restaurant_overview', { p_restaurant_id: id }, { enabled: restaurantId !== null });
  const config = useRpc<AppConfig>('app_config', {});
  const invalidate = [['rpc', 'admin_restaurant_overview'], ['rpc', 'admin_restaurants']];
  const review = useRpcMutation('review_restaurant', { invalidate, success: t('common.saved') });
  const setFeeMutation = useRpcMutation('set_restaurant_fee', { invalidate, success: t('common.saved') });
  const data = overview.data;
  const manage = can('restaurants.manage');
  const allTicked = checks.every((c) => ticked[c]);
  const min = config.data ? settingNumber(config.data, 'fee_percent_min') : 0;
  const max = config.data ? settingNumber(config.data, 'fee_percent_max') : 100;

  const decide = (decision: string) =>
    review.mutate({ p_restaurant_id: id, p_decision: decision, p_note: note || undefined }, { onSuccess: onClose });

  return (
    <Dialog open={restaurantId !== null} onOpenChange={(o) => !o && onClose()} title={data?.restaurant.name ?? t('sa.nav.restaurants')} closeLabel={t('common.close')}>
      {!data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <StatusChip status={data.restaurant.status} />
            <span className="text-caption text-muted">{data.owner_email}</span>
          </div>
          <p className="text-body text-ink">{data.restaurant.address}</p>
          <p className="text-caption text-muted tabular-nums">
            {t('sa.restaurants.stats', { menu: data.menu_items, redeemed: data.verified_redemptions, fees: formatPaise(data.fees_paise) })}
          </p>
          <ul className="flex flex-col gap-1 text-caption">
            {data.offers.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>{o.title}</span>
                <span className="text-muted">
                  {o.status.replaceAll('_', ' ')} · {o.codes_issued}/{o.total_codes}
                </span>
              </li>
            ))}
          </ul>

          {manage && data.restaurant.status === 'pending' ? (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-caption font-medium text-ink">{t('sa.restaurants.review_checklist')}</legend>
              {checks.map((c) => (
                <Checkbox key={c} label={t(c)} checked={ticked[c] === true} onCheckedChange={(v) => setTicked({ ...ticked, [c]: v })} />
              ))}
            </fieldset>
          ) : null}

          {manage ? (
            <>
              <FormField label={t('sa.restaurants.review_note')}>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </FormField>
              <div className="flex flex-wrap gap-2">
                {data.restaurant.status === 'pending' ? (
                  <>
                    <Button disabled={!allTicked} loading={review.isPending} onClick={() => decide('approve')}>
                      {t('sa.restaurants.approve')}
                    </Button>
                    <Button variant="destructive" loading={review.isPending} onClick={() => decide('reject')}>
                      {t('sa.restaurants.reject')}
                    </Button>
                  </>
                ) : null}
                {data.restaurant.status === 'approved' ? (
                  <Button variant="destructive" loading={review.isPending} onClick={() => decide('suspend')}>
                    {t('sa.restaurants.suspend')}
                  </Button>
                ) : null}
                {data.restaurant.status === 'suspended' ? (
                  <Button loading={review.isPending} onClick={() => decide('reinstate')}>
                    {t('sa.restaurants.reinstate')}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <FormField label={t('sa.restaurants.fee')} hint={t('sa.settings.bounds', { min, max })}>
                  <Input type="number" min={min} max={max} value={fee || String(data.restaurant.fee_percent)} onChange={(e) => setFee(e.target.value)} />
                </FormField>
                <Button variant="secondary" loading={setFeeMutation.isPending} onClick={() => setFeeMutation.mutate({ p_restaurant_id: id, p_fee_percent: Number(fee || data.restaurant.fee_percent) })}>
                  {t('common.save')}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
