'use client';

import { formatDateIst, formatPaise, toCsv } from '@datapal/core';
import { Button, DataTable, EmptyState, Pagination, StatusChip, useRows, useT } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { downloadCsv } from '../download-csv';

interface Entry {
  id: string;
  kind: string;
  fee_paise: number;
  gst_paise: number;
  period: string;
  status: string;
  description: string;
  created_at: string;
}

const PAGE = 50;

export function LedgerPanel() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const [page, setPage] = useState(0);
  const rows = useRows<Entry[]>(['rows', 'fee_ledger', restaurant.id, page], (api) =>
    api.from('fee_ledger').select('id, kind, fee_paise, gst_paise, period, status, description, created_at').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1),
  );

  const columns: ColumnDef<Entry>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
    { header: t('sa.billing.kind'), cell: ({ row }) => (row.original.kind === 'boost_fee' ? t('rd.billing.kind_boost_fee') : t('rd.billing.kind_referral_fee')) },
    { header: t('rd.billing.subtotal'), cell: ({ row }) => formatPaise(row.original.fee_paise) },
    { header: t('rd.billing.gst'), cell: ({ row }) => formatPaise(row.original.gst_paise) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden />} disabled={!rows.data?.length} onClick={() => downloadCsv('fee-ledger.csv', toCsv((rows.data ?? []).map(({ id: _id, ...rest }) => rest)))}>
          {t('common.download_csv')}
        </Button>
      </div>
      <DataTable caption={t('rd.billing.ledger')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={Receipt} title={t('rd.billing.empty_title')} body={t('rd.billing.empty')} />} />
      <Pagination page={page} hasNext={(rows.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
    </div>
  );
}
