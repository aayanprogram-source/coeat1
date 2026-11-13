import { formatDateTimeIst } from '@datapal/core';
import { DataTable, EmptyState, Input, Pagination, useRows, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { ErrorRow, PAGE } from './audit-types';

export function ErrorsPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const [source, setSource] = useState('');
  const rows = useRows<ErrorRow[]>(['rows', 'error_log', page, source], (api) => {
    let query = api.from('error_log').select('id, source, message, created_at').order('created_at', { ascending: false });
    if (source) query = query.ilike('source', `%${source}%`);
    return query.range(page * PAGE, page * PAGE + PAGE - 1);
  });
  const columns: ColumnDef<ErrorRow>[] = [
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
