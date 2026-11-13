'use client';

import { weeklyHours, type WeeklyHours } from '@datapal/core';
import { Button, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { WeeklyHoursEditor } from '@/components/weekly-hours-editor';

export function HoursStep({ restaurantId, initial, onSaved }: { restaurantId: string; initial: WeeklyHours; onSaved: () => void }) {
  const t = useT();
  const [hours, setHours] = useState<WeeklyHours>(initial);
  const save = useRpcMutation('update_restaurant');
  const open = Object.values(hours).some((rows) => rows.length > 0);
  const valid = weeklyHours.safeParse(hours).success && open;

  return (
    <div className="flex flex-col gap-4">
      <WeeklyHoursEditor value={hours} onChange={setHours} />
      {!open ? <p className="text-caption text-muted">{t('rd.hours.need_one')}</p> : null}
      <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate({ p_restaurant_id: restaurantId, p_details: { hours } }, { onSuccess: onSaved })}>
        {t('common.continue')}
      </Button>
    </div>
  );
}
