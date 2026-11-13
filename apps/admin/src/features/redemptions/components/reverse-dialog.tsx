'use client';

import { reverseInputSchema } from '@datapal/core';
import { Button, Dialog, FormField, Textarea, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';

export function ReverseDialog({ redemptionId, onClose }: { redemptionId: string | null; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const reverse = useRpcMutation('reverse_redemption', { invalidate: [['rpc', 'admin_redemptions'], ['rpc', 'admin_sample_redemptions']], success: t('common.saved') });
  const valid = redemptionId !== null && reverseInputSchema.safeParse({ redemption_id: redemptionId, reason }).success;

  return (
    <Dialog open={redemptionId !== null} onOpenChange={(o) => !o && onClose()} title={t('rd.redeem.reverse')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4">
        <FormField label={t('rd.redeem.reverse_reason')} hint={t('sa.redemptions.reason_hint')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <Button
          variant="destructive"
          disabled={!valid}
          loading={reverse.isPending}
          onClick={() => redemptionId && reverse.mutate({ p_redemption_id: redemptionId, p_reason: reason }, { onSuccess: () => { setReason(''); onClose(); } })}
        >
          {t('rd.redeem.reverse')}
        </Button>
      </div>
    </Dialog>
  );
}
