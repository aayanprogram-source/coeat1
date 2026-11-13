'use client';

import type { AppConfig } from '@datapal/core';
import { Button, Dialog, FormField, Select, Textarea, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';

export function ReportReviewDialog({ storyId, onClose }: { storyId: string | null; onClose: () => void }) {
  const t = useT();
  const config = useRpc<AppConfig>('app_config', {});
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const report = useRpcMutation('report_story', { success: t('rd.reviews.reported') });

  return (
    <Dialog open={storyId !== null} onOpenChange={(o) => !o && onClose()} title={t('rd.reviews.report')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4">
        <FormField label={t('rd.reviews.reason')}>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{t('common.none')}</option>
            {(config.data?.report_reasons ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('rd.reviews.note')} optionalLabel={`(${t('common.optional')})`}>
          <Textarea maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <Button disabled={!reason} loading={report.isPending} onClick={() => storyId && report.mutate({ p_story_id: storyId, p_reason_id: reason, p_note: note }, { onSuccess: onClose })}>
          {t('rd.reviews.report')}
        </Button>
      </div>
    </Dialog>
  );
}
