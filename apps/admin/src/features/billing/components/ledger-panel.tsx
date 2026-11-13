'use client';

import { formatDateIst, formatPaise } from '@datapal/core';
import { DataTable, EmptyState, Pagination, useRows, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';
import { useState } from 'react';

interface LedgerRow {
  id: string;
  kind: string;
  fee_paise: number;
  gst_paise: number;
  period: string;
  status: string;
  restaurant_id: string;
  created_at: string;
}

const PAGE = 50;

export function LedgerPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const rows = useRows<LedgerRow[]>(['rows', 'fee_ledger', page], (api) =>
    api.from('fee_ledger').select('id, kind, fee_paise, gst_paise, period, status, restaurant_id, created_at').order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1) as never,
  );

  const columns: ColumnDef<LedgerRow, unknown>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
    { header: t('sa.billing.kind'), cell: ({ row }) => (row.original.kind === 'boost_fee' ? t('rd.billing.kind_boost_fee') : t('rd.billing.kind_referral_fee')) },
    { header: t('rd.billing.subtotal'), cell: ({ row }) => formatPaise(Number(row.original.fee_paise)) },
    { header: t('rd.billing.gst'), cell: ({ row }) => formatPaise(Number(row.original.gst_paise)) },
    { header: t('sa.billing.period'), cell: ({ row }) => formatDateIst(row.original.period) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
  ];

  return (
    <div className="flex flex-col gap-2">
      <DataTable caption={t('rd.billing.ledger')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={Receipt} title={t('rd.billing.empty')} body={t('sa.billing.empty_body')} />} />
      <Pagination page={page} hasNext={(rows.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
    </div>
  );
}
