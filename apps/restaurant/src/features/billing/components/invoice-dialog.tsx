'use client';

import { formatDateIst, formatPaise } from '@datapal/core';
import { Button, Dialog, Skeleton, useRpc, useT } from '@datapal/ui-web';
import { Printer } from 'lucide-react';

interface Detail {
  invoice: { number: string; period: string; subtotal_paise: number; gst_paise: number; total_paise: number; gst_percent: number; due_at: string; status: string };
  restaurant: { name: string; address: string };
  company: { legal_name: string; gstin: string; address: string; sac: string; bank: Record<string, string>; upi: string };
  lines: { kind: string; description: string; count: number; fee_paise: number; gst_paise: number }[];
}

/** A printable invoice with its GST breakdown. "Download PDF" opens the browser's save-as-PDF print dialog. */
export function InvoiceDialog({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const t = useT();
  const detail = useRpc<Detail>('invoice_detail', { p_invoice_id: invoiceId ?? '' }, { enabled: invoiceId !== null });
  const d = detail.data;

  return (
    <Dialog open={invoiceId !== null} onOpenChange={(o) => !o && onClose()} title={d?.invoice.number ?? t('rd.billing.invoices')} closeLabel={t('common.close')}>
      {!d ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="flex flex-col gap-4 text-body tabular-nums">
          <div className="grid gap-1 text-caption text-muted">
            <p className="text-ink">{d.company.legal_name}</p>
            <p>{d.company.address}</p>
            <p>
              GSTIN {d.company.gstin} · SAC {d.company.sac}
            </p>
            <p className="pt-2 text-ink">{d.restaurant.name}</p>
            <p>{d.restaurant.address}</p>
            <p>
              {formatDateIst(d.invoice.period, { day: undefined })} · {t('rd.billing.due', { date: formatDateIst(d.invoice.due_at) })}
            </p>
          </div>
          <table className="w-full text-left">
            <thead className="text-caption text-muted">
              <tr>
                <th scope="col" className="py-1">{t('rd.billing.line')}</th>
                <th scope="col" className="py-1 text-right">{t('rd.billing.subtotal')}</th>
                <th scope="col" className="py-1 text-right">{t('rd.billing.gst')}</th>
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-2">{l.kind === 'boost_fee' ? t('rd.billing.kind_boost_fee') : `${t('rd.billing.kind_referral_fee')} × ${l.count}`}</td>
                  <td className="py-2 text-right">{formatPaise(l.fee_paise)}</td>
                  <td className="py-2 text-right">{formatPaise(l.gst_paise)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="py-2">{t('common.total')} ({d.invoice.gst_percent}% GST)</th>
                <td className="py-2 text-right">{formatPaise(d.invoice.subtotal_paise)}</td>
                <td className="py-2 text-right font-medium">{formatPaise(d.invoice.total_paise)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-caption text-muted">
            {t('rd.billing.pay_to')}: {d.company.upi} · {Object.values(d.company.bank).filter(Boolean).join(', ')}
          </p>
          <Button variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden />} onClick={() => window.print()}>
            {t('common.download_pdf')}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
