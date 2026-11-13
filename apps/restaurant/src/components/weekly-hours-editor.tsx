'use client';

import type { WeeklyHours } from '@datapal/core';
import { Button, Input, useT } from '@datapal/ui-web';
import { Plus, Trash2 } from 'lucide-react';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Opening hours for each day; a day with no rows is closed. */
export function WeeklyHoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (next: WeeklyHours) => void }) {
  const t = useT();
  const update = (day: (typeof days)[number], rows: { open: string; close: string }[]) => onChange({ ...value, [day]: rows });
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const rows = value[day] ?? [];
        return (
          <div key={day} className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-body font-medium uppercase text-ink">{day}</span>
            {rows.length === 0 ? <span className="text-caption text-muted">{t('rd.hours.closed')}</span> : null}
            {rows.map((r, i) => (
              <span key={i} className="flex items-center gap-1">
                <Input type="time" aria-label={`${day} ${t('rd.offers.from')}`} value={r.open} className="w-32" onChange={(e) => update(day, rows.map((x, n) => (n === i ? { ...x, open: e.target.value } : x)))} />
                <Input type="time" aria-label={`${day} ${t('rd.offers.to')}`} value={r.close} className="w-32" onChange={(e) => update(day, rows.map((x, n) => (n === i ? { ...x, close: e.target.value } : x)))} />
                <Button variant="ghost" aria-label={t('common.remove')} onClick={() => update(day, rows.filter((_, n) => n !== i))}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </span>
            ))}
            {rows.length < 3 ? (
              <Button variant="ghost" aria-label={`${t('rd.hours.add')} ${day}`} onClick={() => update(day, [...rows, { open: '10:00', close: '22:00' }])}>
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
