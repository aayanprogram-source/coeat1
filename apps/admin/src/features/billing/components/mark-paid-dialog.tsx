'use client';

import { Button, Dialog, FormField, Input, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';

export function MarkPaidDialog({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const t = useT();
  const [reference, setReference] = useState('');
  const mark = useRpcMutation('mark_invoice_paid', { invalidate: [['rpc', 'admin_invoices']], success: t('common.saved') });

  return (
    <Dialog open={invoiceId !== null} onOpenChange={(o) => !o && onClose()} title={t('sa.billing.mark_paid')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4">
        <FormField label={t('sa.billing.bank_reference')}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </FormField>
        <Button
          disabled={reference.trim().length < 3}
          loading={mark.isPending}
          onClick={() => invoiceId && mark.mutate({ p_invoice_id: invoiceId, p_bank_reference: reference.trim() }, { onSuccess: () => { setReference(''); onClose(); } })}
        >
          {t('sa.billing.mark_paid')}
        </Button>
      </div>
    </Dialog>
  );
}
