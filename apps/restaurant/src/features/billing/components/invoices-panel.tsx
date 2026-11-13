'use client';

import { formatDateIst, formatPaise, toCsv, type AppConfig } from '@datapal/core';
import { Button, Card, DataTable, EmptyState, StatusChip, invokeFunction, useApi, useRows, useRpc, useT, useToast } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileText, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { downloadCsv } from '../download-csv';
import { InvoiceDialog } from './invoice-dialog';

export interface Invoice {
  id: string;
  number: string;
  period: string;
  subtotal_paise: number;
  gst_paise: number;
  total_paise: number;
  status: string;
  due_at: string;
  payment_link: string | null;
}

export function InvoicesPanel() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const { restaurant } = useRestaurant();
  const [open, setOpen] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const config = useRpc<AppConfig>('app_config', {});
  const summary = useRpc<{ company: { bank: Record<string, string>; upi: string }; accrued_paise: number }>('restaurant_billing_summary', { p_restaurant_id: restaurant.id });
  const rows = useRows<Invoice[]>(['rows', 'invoices', restaurant.id], (a) => a.from('invoices').select('id, number, period, subtotal_paise, gst_paise, total_paise, status, due_at, payment_link').eq('restaurant_id', restaurant.id).order('period', { ascending: false }));

  const payNow = async (id: string) => {
    setPaying(id);
    const data = await invokeFunction<{ url?: string }>(api, 'create-payment-link', { invoice_id: id });
    setPaying(null);
    if (!data?.url) toast.error(t('errors.unknown'));
    else window.open(data.url, '_blank', 'noopener,noreferrer');
  };

  const columns: ColumnDef<Invoice>[] = [
    { header: t('sa.billing.number'), accessorKey: 'number' },
    { header: t('sa.billing.period'), cell: ({ row }) => formatDateIst(row.original.period, { day: undefined }) },
    { header: t('rd.billing.subtotal'), cell: ({ row }) => formatPaise(row.original.subtotal_paise) },
    { header: t('rd.billing.gst'), cell: ({ row }) => formatPaise(row.original.gst_paise) },
    { header: t('common.total'), cell: ({ row }) => formatPaise(row.original.total_paise) },
    { header: t('rd.billing.due_column'), cell: ({ row }) => formatDateIst(row.original.due_at) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FileText className="h-4 w-4" aria-hidden />} onClick={() => setOpen(row.original.id)}>
            {t('rd.billing.view')}
          </Button>
          {row.original.status !== 'paid' && config.data?.integrations.payments ? (
            <Button loading={paying === row.original.id} onClick={() => void payNow(row.original.id)}>
              {t('rd.billing.pay_now')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Card className="flex-1">
          <p className="text-caption text-muted">{t('rd.billing.accrued')}</p>
          <p className="font-heading text-h1 font-semibold tabular-nums text-ink">{summary.data ? formatPaise(summary.data.accrued_paise) : '–'}</p>
          <p className="text-caption text-muted">{t('rd.billing.accrued_note')}</p>
        </Card>
        <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden />} disabled={!rows.data?.length} onClick={() => downloadCsv('invoices.csv', toCsv((rows.data ?? []).map(({ id: _id, payment_link: _link, ...rest }) => rest)))}>
          {t('common.download_csv')}
        </Button>
      </div>
      <DataTable caption={t('rd.billing.invoices')} columns={columns} rows={rows.data ?? []} loading={rows.isLoading} empty={<EmptyState icon={Receipt} title={t('rd.billing.empty_title')} body={t('rd.billing.empty')} />} />
      <InvoiceDialog invoiceId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
