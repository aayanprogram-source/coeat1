'use client';

import { formatDateTimeIst } from '@datapal/core';
import { Button, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton, useRpc, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';

interface Flag {
  id: string;
  kind: string;
  status: string;
  evidence: Record<string, unknown>;
  created_at: string;
  user_id: string | null;
  restaurant_id: string | null;
  user_name: string | null;
  restaurant_name: string | null;
}

export function FraudScreen() {
  const t = useT();
  const can = useCan();
  const [status, setStatus] = useState('open');
  const query = useRpc<Flag[]>('admin_fraud_flags', { p_status: status });
  const resolve = useRpcMutation('resolve_fraud_flag', { invalidate: [['rpc', 'admin_fraud_flags']], success: t('common.saved') });
  const manage = can('fraud.manage');

  return (
    <Screen permission="fraud.view">
      <PageHeader
        title={t('sa.nav.fraud')}
        actions={
          <Select aria-label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value)}>
            {['open', 'confirmed', 'dismissed'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        }
      />
      {query.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : query.data?.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('sa.fraud.empty')} body={t('sa.fraud.empty_body')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {(query.data ?? []).map((flag) => (
            <li key={flag.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">{flag.kind.replaceAll('_', ' ')}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-muted">{formatDateTimeIst(flag.created_at)}</span>
                    <StatusChip status={flag.status} />
                  </div>
                </div>
                <p className="text-caption text-muted">{[flag.user_name, flag.restaurant_name].filter(Boolean).join(' · ')}</p>
                <div>
                  <p className="text-caption font-medium text-ink">{t('sa.fraud.evidence')}</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-input bg-background p-3 text-caption">{JSON.stringify(flag.evidence, null, 2)}</pre>
                </div>
                {manage && flag.status === 'open' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => resolve.mutate({ p_flag_id: flag.id, p_action: 'confirm' })}>{t('sa.fraud.confirm')}</Button>
                    <Button variant="secondary" onClick={() => resolve.mutate({ p_flag_id: flag.id, p_action: 'dismiss' })}>
                      {t('sa.fraud.dismiss')}
                    </Button>
                    {flag.user_id ? (
                      <Button variant="destructive" onClick={() => resolve.mutate({ p_flag_id: flag.id, p_action: 'suspend_user' })}>
                        {t('sa.fraud.suspend_user')}
                      </Button>
                    ) : null}
                    {flag.restaurant_id ? (
                      <Button variant="destructive" onClick={() => resolve.mutate({ p_flag_id: flag.id, p_action: 'suspend_restaurant' })}>
                        {t('sa.fraud.suspend_restaurant')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
