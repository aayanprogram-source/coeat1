'use client';

import { toCsv, type CsvRow } from '@datapal/core';
import { Button, FormField, Input, useApi, useT, useToast } from '@datapal/ui-web';
import { Download } from 'lucide-react';
import { useState } from 'react';

export function ExportPanel() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const { data, error } = await api.rpc('accountant_export', { p_from: from, p_to: to });
    setBusy(false);
    if (error) {
      toast.error(t('errors.not_permitted'));
      return;
    }
    const rows = data as unknown as CsvRow[];
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `invoices-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-body text-muted">{t('sa.billing.export_help')}</p>
      <FormField label={t('sa.billing.from')}>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </FormField>
      <FormField label={t('sa.billing.to')}>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </FormField>
      <Button icon={<Download className="h-4 w-4" aria-hidden />} loading={busy} onClick={() => void download()}>
        {t('common.download_csv')}
      </Button>
    </div>
  );
}
