'use client';

import { rewardLevelSchema, settingNumber, type AppConfig } from '@datapal/core';
import { Button, Card, FormField, Input, Select, Skeleton, useRows, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';

interface Level {
  id: string;
  friends_required: number;
  type: 'percent_off' | 'free_item' | 'free_meal';
  value: number;
  label: string;
}

const blank = { friends_required: 3, type: 'free_item' as Level['type'], value: 0, label: '' };

export function LevelsPanel() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const config = useRpc<AppConfig>('app_config', {});
  const levels = useRows<Level[]>(['rows', 'reward_levels', restaurant.id], (api) => api.from('reward_levels').select('id, friends_required, type, value, label').eq('restaurant_id', restaurant.id).eq('is_active', true).order('friends_required') as never);
  const [draft, setDraft] = useState(blank);
  const invalidate = [['rows', 'reward_levels']];
  const save = useRpcMutation('save_reward_level', { invalidate, success: t('common.saved') });
  const remove = useRpcMutation('delete_reward_level', { invalidate, success: t('common.deleted') });
  const maxPercent = config.data ? settingNumber(config.data, 'max_discount_percent') : 100;
  const parsed = rewardLevelSchema.safeParse(draft);
  const percentOk = draft.type !== 'percent_off' || (draft.value >= 1 && draft.value <= maxPercent);

  if (levels.isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {(levels.data ?? []).map((l) => (
          <li key={l.id}>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{l.label}</p>
                <p className="text-caption text-muted tabular-nums">
                  {t('rd.promoters.friends_required')}: {l.friends_required} · {t(`rd.promoters.type_${l.type}` as 'rd.promoters.type_free_item')}
                  {l.type === 'percent_off' ? ` · ${l.value}%` : ''}
                </p>
              </div>
              <Button variant="ghost" aria-label={t('common.remove')} onClick={() => remove.mutate({ p_restaurant_id: restaurant.id, p_id: l.id })}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </Card>
          </li>
        ))}
        {levels.data?.length === 0 ? <p className="text-body text-muted">{t('rd.promoters.no_levels')}</p> : null}
      </ul>
      <Card className="flex max-w-xl flex-col gap-3">
        <h3 className="font-heading text-h2 font-semibold text-ink">{t('rd.promoters.add_level')}</h3>
        <FormField label={t('rd.promoters.friends_required')}>
          <Input type="number" min={1} value={draft.friends_required} onChange={(e) => setDraft({ ...draft, friends_required: Number(e.target.value) })} />
        </FormField>
        <FormField label={t('rd.promoters.reward_type')}>
          <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Level['type'] })}>
            {(['percent_off', 'free_item', 'free_meal'] as const).map((type) => (
              <option key={type} value={type}>
                {t(`rd.promoters.type_${type}` as 'rd.promoters.type_free_item')}
              </option>
            ))}
          </Select>
        </FormField>
        {draft.type === 'percent_off' ? (
          <FormField label={t('rd.promoters.value')} hint={t('rd.offers.bounds', { min: 1, max: maxPercent })}>
            <Input type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
          </FormField>
        ) : null}
        <FormField label={t('rd.promoters.label')}>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </FormField>
        <Button icon={<Plus className="h-4 w-4" aria-hidden />} disabled={!parsed.success || !percentOk} loading={save.isPending} onClick={() => save.mutate({ p_restaurant_id: restaurant.id, p_id: undefined, p_data: draft }, { onSuccess: () => setDraft(blank) })}>
          {t('rd.promoters.add_level')}
        </Button>
      </Card>
    </div>
  );
}
