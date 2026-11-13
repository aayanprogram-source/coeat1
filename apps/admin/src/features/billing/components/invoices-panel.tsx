'use client';

import { formatDateIst, formatPaise, type AppConfig } from '@datapal/core';
import { Button, DataTable, EmptyState, Input, Select, invokeFunction, useApi, useRpc, useRpcMutation, useT, useToast, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { FilePlus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { MarkPaidDialog } from './mark-paid-dialog';

interface Invoice {
  id: string;
  number: string;
  period: string;
  subtotal_paise: number;
  gst_paise: number;
  total_paise: number;
  status: string;
  due_at: string;
  paid_at: string | null;
  bank_reference: string | null;
  payment_link: string | null;
  restaurant: string;
}

export function InvoicesPanel() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const can = useCan();
  const [status, setStatus] = useState('');
  const [paying, setPaying] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const query = useRpc<Invoice[]>('admin_invoices', { p_status: status || undefined });
  const config = useRpc<AppConfig>('app_config', {});
  const generate = useRpcMutation('generate_invoices', { invalidate: [['rpc', 'admin_invoices']], success: t('sa.billing.generated') });

  const makeLink = async (id: string) => {
    const data = await invokeFunction<{ url?: string }>(api, 'create-payment-link', { invoice_id: id });
    if (!data?.url) toast.error(t('errors.unknown'));
    else {
      await navigator.clipboard.writeText(data.url);
      toast.success(t('common.copied'));
      void query.refetch();
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    { header: t('sa.billing.number'), accessorKey: 'number' },
    { header: t('sa.offers.restaurant'), accessorKey: 'restaurant' },
    { header: t('sa.billing.period'), cell: ({ row }) => formatDateIst(row.original.period, { day: undefined }) },
    { header: t('rd.billing.subtotal'), cell: ({ row }) => formatPaise(row.original.subtotal_paise) },
    { header: t('rd.billing.gst'), cell: ({ row }) => formatPaise(row.original.gst_paise) },
    { header: t('common.total'), cell: ({ row }) => formatPaise(row.original.total_paise) },
    { header: t('rd.billing.due', { date: '' }).trim(), cell: ({ row }) => formatDateIst(row.original.due_at) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) =>
        can('billing.manage') && row.original.status !== 'paid' ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPaying(row.original.id)}>
              {t('sa.billing.mark_paid')}
            </Button>
            {config.data?.integrations.payments ? (
              <Button variant="ghost" onClick={() => void makeLink(row.original.id)}>
                {row.original.payment_link ? t('sa.billing.copy_link') : t('sa.billing.create_link')}
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select aria-label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
          <option value="">{t('common.all')}</option>
          {['issued', 'paid', 'overdue'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {can('billing.manage') ? (
          <div className="flex items-end gap-2">
            <Input type="month" aria-label={t('sa.billing.period')} value={period} onChange={(e) => setPeriod(e.target.value)} />
            <Button icon={<FilePlus className="h-4 w-4" aria-hidden />} loading={generate.isPending} onClick={() => generate.mutate({ p_period: `${period}-01` })}>
              {t('sa.billing.generate')}
            </Button>
          </div>
        ) : null}
      </div>
      <DataTable caption={t('rd.billing.invoices')} columns={columns} rows={query.data ?? []} loading={query.isLoading} empty={<EmptyState icon={Receipt} title={t('sa.billing.empty')} body={t('sa.billing.empty_body')} />} />
      <MarkPaidDialog invoiceId={paying} onClose={() => setPaying(null)} />
    </div>
  );
}
