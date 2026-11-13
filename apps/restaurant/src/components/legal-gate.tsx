'use client';

import type { PendingLegal } from '@datapal/core';
import { Button, Card, Skeleton, useRows, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import type { ReactNode } from 'react';

interface Doc {
  kind: string;
  version: number;
  title: string;
  body: string;
}

/** A new published version of a legal document must be accepted before the dashboard opens. */
export function LegalGate({ children }: { children: ReactNode }) {
  const t = useT();
  const pending = useRpc<PendingLegal[]>('pending_legal', { p_audience: 'restaurant' });
  const kinds = (pending.data ?? []).map((d) => d.kind);
  const docs = useRows<Doc[]>(
    ['rows', 'legal_documents', kinds],
    (api) => api.from('legal_documents').select('kind, version, title, body').in('kind', kinds).not('published_at', 'is', null).order('version', { ascending: false }),
    kinds.length > 0,
  );
  const accept = useRpcMutation('accept_legal_documents', { invalidate: [['rpc', 'pending_legal'], ['rpc', 'my_restaurants']], success: t('common.saved') });

  if (pending.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!pending.data || pending.data.length === 0) return <>{children}</>;

  const latest = (kind: string) => (docs.data ?? []).find((d) => d.kind === kind);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-heading text-h1 font-semibold text-ink">{t('onboarding.legal_reaccept_title')}</h1>
      <p className="text-body text-muted">{t('onboarding.legal_reaccept_body')}</p>
      {pending.data.map((p) => (
        <Card key={p.kind}>
          <h2 className="font-heading text-h2 font-semibold text-ink">{p.title}</h2>
          <p className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-body text-ink">{latest(p.kind)?.body ?? ''}</p>
        </Card>
      ))}
      <Button loading={accept.isPending} onClick={() => accept.mutate({ p_audience: 'restaurant' })}>
        {t('rd.legal.accept')}
      </Button>
    </div>
  );
}
