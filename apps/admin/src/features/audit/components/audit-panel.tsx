import { formatDateTimeIst } from '@datapal/core';
import { DataTable, EmptyState, Input, Pagination, useRows, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Changes } from './changes-cell';
import { AuditRow, PAGE } from './audit-types';

export function AuditPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState('');
  const rows = useRows<AuditRow[]>(['rows', 'audit_log', page, entity], (api) => {
    let query = api.from('audit_log').select('*').order('created_at', { ascending: false });
    if (entity) query = query.ilike('entity', `%${entity}%`);
    return query.range(page * PAGE, page * PAGE + PAGE - 1);
  });
  const columns: ColumnDef<AuditRow>[] = [
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
