'use client';

import type { ChecklistItem } from '@datapal/core';
import { Card, Chip, ErrorState, PageHeader, Skeleton, useRpc, useT } from '@datapal/ui-web';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Screen } from '@/components/screen';

export function ChecklistScreen() {
  const t = useT();
  const query = useRpc<ChecklistItem[]>('go_live_checklist', {}, { refetchInterval: 30_000 });
  const items = query.data ?? [];
  const open = items.filter((i) => !i.ok);

  return (
    <Screen permission="checklist.view">
      <PageHeader title={t('sa.checklist.title')} description={query.data ? (open.length === 0 ? t('sa.checklist.ready') : t('sa.checklist.not_ready', { count: open.length })) : undefined} />
      {query.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.key}>
              <Card className="flex items-start gap-3">
                {item.ok ? (
                  <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleAlert className="mt-0.5 h-6 w-6 shrink-0 text-coral-500" aria-hidden />
                )}
                <div className="flex-1">
                  <p className="font-medium text-ink">{item.label}</p>
                  {item.detail ? <p className="text-caption text-muted">{item.detail}</p> : null}
                  {!item.ok ? <p className="mt-1 text-caption text-muted">{t('sa.checklist.hidden_features')}: {item.hides}</p> : null}
                </div>
                <Chip tone={item.ok ? 'success' : 'warning'}>{item.ok ? t('sa.checklist.done') : t('sa.checklist.todo')}</Chip>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
