'use client';

import { formatCountdown, formatPaise, type RedeemResult } from '@datapal/core';
import { Button, Card, useRpcMutation, useT } from '@datapal/ui-web';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Done = Extract<RedeemResult, { ok: true }>;

export function ResultPanel({ result, onNext }: { result: Done; onNext: () => void }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const [undone, setUndone] = useState(false);
  const reverse = useRpcMutation('reverse_redemption', { success: t('rd.redeem.undone') });
  const until = result.undo_until ? new Date(result.undo_until).getTime() : 0;
  const remaining = until - now;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
      <h2 className="font-heading text-h1 font-semibold text-ink">{undone ? t('rd.redeem.undone') : t('rd.redeem.success')}</h2>
      {undone ? null : (
        <dl className="grid w-full max-w-xs grid-cols-2 gap-1 text-body tabular-nums">
          <dt className="text-muted">{t('rd.redeem.discount')}</dt>
          <dd className="text-right text-ink">{formatPaise(result.discount_paise ?? 0)}</dd>
          <dt className="text-muted">{t('rd.redeem.to_collect')}</dt>
          <dd className="text-right font-medium text-ink">{formatPaise(result.customer_pays_paise ?? 0)}</dd>
        </dl>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {!undone && remaining > 0 ? (
          <Button
            variant="secondary"
            loading={reverse.isPending}
            onClick={() => reverse.mutate({ p_redemption_id: result.redemption_id }, { onSuccess: () => setUndone(true) })}
          >
            {t('rd.redeem.undo')} · {formatCountdown(remaining)}
          </Button>
        ) : null}
        <Button onClick={onNext} autoFocus>
          {t('rd.redeem.new')}
        </Button>
      </div>
    </Card>
  );
}
