'use client';

import { formatDateTimeIst } from '@datapal/core';
import { Button, DataTable, EmptyState, Input, PageHeader, Pagination, Tabs, useRows, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Screen } from '@/components/screen';

const PAGE = 50;

interface AuditRow {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  before: unknown;
  after: unknown;
  created_at: string;
}

function Changes({ row }: { row: AuditRow }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t('sa.audit.hide') : t('sa.audit.show')}
      </Button>
      {open ? (
        <div className="grid min-w-[320px] gap-2 sm:grid-cols-2">
          <pre className="max-h-48 overflow-auto rounded-input bg-background p-2 text-caption">{t('sa.audit.before')}: {JSON.stringify(row.before, null, 1)}</pre>
          <pre className="max-h-48 overflow-auto rounded-input bg-background p-2 text-caption">{t('sa.audit.after')}: {JSON.stringify(row.after, null, 1)}</pre>
        </div>
      ) : null}
    </div>
  );
}

function AuditPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState('');
  const rows = useRows<AuditRow[]>(['rows', 'audit_log', page, entity], (api) => {
    let query = api.from('audit_log').select('*').order('created_at', { ascending: false });
    if (entity) query = query.ilike('entity', `%${entity}%`);
    return query.range(page * PAGE, page * PAGE + PAGE - 1) as never;
  });
  const columns: ColumnDef<AuditRow, unknown>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateTimeIst(row.original.created_at) },
    { header: t('sa.audit.entity'), accessorKey: 'entity' },
    { header: t('sa.audit.entity_id'), cell: ({ row }) => <span className="break-all">{row.original.entity_id}</span> },
    { header: t('sa.audit.action'), accessorKey: 'action' },
    { header: t('sa.audit.changes'), cell: ({ row }) => <Changes row={row.original} /> },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-sm">
        <Input type="search" aria-label={t('sa.audit.filter_entity')} placeholder={t('sa.audit.filter_entity')} value={entity} onChange={(e) => { setEntity(e.target.value); setPage(0); }} />
      </div>
      <DataTable caption={t('sa.nav.audit')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={ScrollText} title={t('sa.audit.empty')} body={t('sa.audit.empty_body')} />} />
      <Pagination page={page} hasNext={(rows.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
    </div>
  );
}

interface ErrorRow {
  id: string;
  source: string;
  message: string;
  created_at: string;
}

function ErrorsPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const [source, setSource] = useState('');
  const rows = useRows<ErrorRow[]>(['rows', 'error_log', page, source], (api) => {
    let query = api.from('error_log').select('id, source, message, created_at').order('created_at', { ascending: false });
    if (source) query = query.ilike('source', `%${source}%`);
    return query.range(page * PAGE, page * PAGE + PAGE - 1) as never;
  });
  const columns: ColumnDef<ErrorRow, unknown>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateTimeIst(row.original.created_at) },
    { header: t('sa.audit.source'), cell: ({ row }) => <StatusChip status={row.original.source} /> },
    { header: t('sa.audit.message'), accessorKey: 'message' },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-sm">
        <Input type="search" aria-label={t('sa.audit.filter_source')} placeholder={t('sa.audit.filter_source')} value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} />
      </div>
      <DataTable caption={t('sa.nav.errors')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={ScrollText} title={t('sa.audit.errors_empty')} body={t('sa.audit.errors_empty_body')} />} />
      <Pagination page={page} hasNext={(rows.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
    </div>
  );
}

export function AuditScreen() {
  const t = useT();
  return (
    <Screen permission="audit.view">
      <PageHeader title={t('sa.nav.audit')} />
      <Tabs
        items={[
          { value: 'audit', label: t('sa.nav.audit'), content: <AuditPanel /> },
          { value: 'errors', label: t('sa.nav.errors'), content: <ErrorsPanel /> },
        ]}
      />
    </Screen>
  );
}
