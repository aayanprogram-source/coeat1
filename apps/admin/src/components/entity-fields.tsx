import { Checkbox, FormField, Input, Select, Textarea, useT } from '@datapal/ui-web';
import type { StringKey } from '@datapal/i18n';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { CityChoices } from './city-choices';
'use client';


export type FieldSpec =
  | { name: string; label: StringKey; type: 'text' | 'number' | 'textarea' }
  | { name: string; label: StringKey; type: 'bool' }
  | { name: string; label: StringKey; type: 'select'; options: { value: string; label: string }[] }
  | { name: string; label: StringKey; type: 'cities' };

export function EntityFields({ fields, form }: { fields: FieldSpec[]; form: UseFormReturn }) {
  const t = useT();
  const errors = form.formState.errors;
  return (
    <>
      {fields.map((f) => {
        const error = errors[f.name] ? t('common.invalid_value') : undefined;
        if (f.type === 'bool') {
          return (
            <Controller
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => <Checkbox label={t(f.label)} checked={field.value === true} onCheckedChange={field.onChange} />}
            />
          );
        }
        if (f.type === 'cities') {
          return (
            <FormField key={f.name} label={t(f.label)}>
              <Controller
                control={form.control}
                name={f.name}
                render={({ field }) => <CityChoices value={(field.value as string[] | undefined) ?? []} onChange={field.onChange} />}
              />
            </FormField>
          );
        }
        return (
          <FormField key={f.name} label={t(f.label)} error={error}>
            {f.type === 'textarea' ? (
              <Textarea {...form.register(f.name)} />
            ) : f.type === 'select' ? (
              <Select {...form.register(f.name)}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input type={f.type === 'number' ? 'number' : 'text'} step="any" {...form.register(f.name, f.type === 'number' ? { valueAsNumber: true } : undefined)} />
            )}
          </FormField>
        );
      })}
    </>
  );
}
