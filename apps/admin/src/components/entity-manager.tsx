'use client';

import { Button, Chip, DataTable, Dialog, EmptyState, ErrorState, PageHeader, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import type { StringKey } from '@datapal/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm, type FieldValues, type Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';
import { EntityFields, type FieldSpec } from './entity-fields';

export interface EntityConfig {
  entity: string;
  table: string;
  pk: string;
  title: StringKey;
  empty: StringKey;
  order: string;
  columns: { key: string; label: StringKey; kind?: 'text' | 'bool' }[];
  fields: FieldSpec[];
  schema: ZodType<FieldValues>;
  defaults: FieldValues;
  readOnly?: boolean;
}

/** One audited create, edit and delete screen for any whitelisted master-data table. */
export function EntityManager({ config, embedded = false }: { config: EntityConfig; embedded?: boolean }) {
  const t = useT();
  const [editing, setEditing] = useState<{ id: string | null; values: FieldValues } | null>(null);
  const key = ['rows', config.table];
  const rows = useRows<Record<string, unknown>[]>(key, (a) => a.from(config.table as 'cities').select('*').order(config.order as 'name').limit(500));
  const save = useRpcMutation('admin_save', { invalidate: [key], success: t('common.saved') });
  const remove = useRpcMutation('admin_delete', { invalidate: [key], success: t('common.deleted') });
  const form = useForm({ resolver: zodResolver(config.schema) as Resolver, defaultValues: config.defaults });

  const open = (id: string | null, values: FieldValues) => {
    form.reset(values);
    setEditing({ id, values });
  };

  const submit = form.handleSubmit(async (values) => {
    await save.mutateAsync({ p_entity: config.entity, p_id: editing?.id ?? undefined, p_data: values });
    setEditing(null);
  });

  const columns: ColumnDef<Record<string, unknown>>[] = [
    ...config.columns.map<ColumnDef<Record<string, unknown>>>((c) => ({
      header: t(c.label),
      accessorKey: c.key,
      cell: ({ getValue }) =>
        c.kind === 'bool' ? <Chip tone={getValue() ? 'success' : 'neutral'}>{getValue() ? t('common.yes') : t('common.no')}</Chip> : formatCell(getValue()),
    })),
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => open(String(row.original[config.pk]), pick(row.original, config.fields))}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" onClick={() => remove.mutate({ p_entity: config.entity, p_id: String(row.original[config.pk]) })}>
            {t('common.delete')}
          </Button>
        </div>
      ),
    },
  ];

  if (rows.isError) return <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void rows.refetch()} />;

  return (
    <section>
      {embedded ? null : <PageHeader title={t(config.title)} />}
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => open(null, config.defaults)}>
          {t('common.new')}
        </Button>
      </div>
      <DataTable
        caption={t(config.title)}
        columns={columns}
        rows={rows.data ?? []}
        loading={rows.isLoading}
        empty={<EmptyState icon={Plus} title={t(config.empty)} body={t('sa.master.empty_body')} />}
      />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={t(config.title)} closeLabel={t('common.close')}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <EntityFields fields={config.fields} form={form} />
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common.save')}
          </Button>
        </form>
      </Dialog>
    </section>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value);
}

function pick(row: Record<string, unknown>, fields: FieldSpec[]): FieldValues {
  return Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? '']));
}
