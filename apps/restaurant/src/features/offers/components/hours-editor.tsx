'use client';

import { Button, Input, Select, useT } from '@datapal/ui-web';
import { Plus, Trash2 } from 'lucide-react';

export interface ActiveWindow {
  day: number;
  from: string;
  to: string;
}

const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Slow-hour windows: codes can only be issued inside them. Empty means all day. */
export function HoursEditor({ value, onChange }: { value: ActiveWindow[]; onChange: (next: ActiveWindow[]) => void }) {
  const t = useT();
  const update = (index: number, patch: Partial<ActiveWindow>) => onChange(value.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  return (
    <div className="flex flex-col gap-2">
      {value.map((w, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Select aria-label={t('rd.offers.day')} value={w.day} onChange={(e) => update(i, { day: Number(e.target.value) })} className="w-28">
            {days.map((d, n) => (
              <option key={d} value={n}>
                {d}
              </option>
            ))}
          </Select>
          <Input type="time" aria-label={t('rd.offers.from')} value={w.from} onChange={(e) => update(i, { from: e.target.value })} className="w-32" />
          <Input type="time" aria-label={t('rd.offers.to')} value={w.to} onChange={(e) => update(i, { to: e.target.value })} className="w-32" />
          <Button variant="ghost" aria-label={t('common.remove')} onClick={() => onChange(value.filter((_, n) => n !== i))}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
      <Button variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => onChange([...value, { day: 1, from: '15:00', to: '18:00' }])}>
        {t('rd.offers.add_window')}
      </Button>
    </div>
  );
}
