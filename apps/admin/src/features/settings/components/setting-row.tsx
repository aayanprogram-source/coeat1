'use client';

import { validateSettingValue, type SettingDefinition } from '@datapal/core';
import { Button, Card, FormField, Input, Switch, Textarea, useT } from '@datapal/ui-web';
import { History } from 'lucide-react';
import { useState } from 'react';

export interface SettingRowProps {
  definition: SettingDefinition;
  current: unknown;
  saving: boolean;
  canEdit: boolean;
  onSave: (value: unknown) => void;
  onHistory: () => void;
}

function toDraft(def: SettingDefinition, value: unknown): string {
  if (def.type === 'json') return JSON.stringify(value ?? def.initial, null, 2);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function parse(def: SettingDefinition, draft: string): unknown {
  if (def.type === 'integer' || def.type === 'number') return draft.trim() === '' ? NaN : Number(draft);
  if (def.type === 'json') {
    try {
      return JSON.parse(draft) as unknown;
    } catch {
      return undefined;
    }
  }
  return draft;
}

export function SettingRow({ definition: def, current, saving, canEdit, onSave, onHistory }: SettingRowProps) {
  const t = useT();
  const [draft, setDraft] = useState(() => toDraft(def, current));
  const [error, setError] = useState<string | null>(null);

  const bounds = def.min !== undefined || def.max !== undefined ? t('sa.settings.bounds', { min: def.min ?? '-', max: def.max ?? '-' }) : undefined;

  const save = (value: unknown) => {
    const result = validateSettingValue(def.key, value);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    onSave(result.value);
  };

  return (
    <Card className="flex flex-col gap-3">
      {def.type === 'boolean' ? (
        <Switch label={def.label} checked={current === true} disabled={!canEdit || saving} onCheckedChange={(v) => save(v)} />
      ) : (
        <FormField label={def.label + (def.unit ? ` (${def.unit})` : '')} hint={bounds} error={error ?? undefined}>
          {def.type === 'text' || def.type === 'json' ? (
            <Textarea value={draft} disabled={!canEdit} onChange={(e) => setDraft(e.target.value)} />
          ) : (
            <Input type={def.type === 'string' ? 'text' : 'number'} value={draft} disabled={!canEdit} onChange={(e) => setDraft(e.target.value)} />
          )}
        </FormField>
      )}
      <p className="text-caption text-muted">{def.description}</p>
      <div className="flex gap-2">
        {def.type !== 'boolean' && canEdit ? (
          <Button loading={saving} onClick={() => save(parse(def, draft))}>
            {t('common.save')}
          </Button>
        ) : null}
        <Button variant="ghost" icon={<History className="h-4 w-4" aria-hidden />} onClick={onHistory}>
          {t('sa.settings.history')}
        </Button>
      </div>
    </Card>
  );
}
