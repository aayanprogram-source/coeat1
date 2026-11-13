'use client';

import { formatDateTimeIst } from '@datapal/core';
import { Button, Card, EmptyState, Skeleton, useApi, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import { Flag } from 'lucide-react';
import { useCan } from '@/components/admin-context';

interface Report {
  id: string;
  note: string;
  created_at: string;
  reason: string;
  story_id: string;
  caption: string;
  photo_path: string;
  author: string;
  restaurant: string;
}

/** The moderation queue, grouped by report reason because the function returns it ordered that way. */
export function ReportsPanel() {
  const t = useT();
  const api = useApi();
  const can = useCan();
  const query = useRpc<Report[]>('moderation_queue', { p_status: 'open', p_limit: 50, p_offset: 0 });
  const resolve = useRpcMutation('resolve_report', { invalidate: [['rpc', 'moderation_queue']], success: t('common.saved') });

  if (query.isLoading) return <Skeleton className="h-32 w-full" />;
  if (!query.data || query.data.length === 0) return <EmptyState icon={Flag} title={t('sa.users.reports_empty')} body={t('sa.users.reports_empty_body')} />;

  const groups = new Map<string, Report[]>();
  for (const report of query.data) groups.set(report.reason, [...(groups.get(report.reason) ?? []), report]);
  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([reason, items]) => (
        <section key={reason} aria-label={reason}>
          <h2 className="mb-2 font-heading text-h2 font-semibold text-ink">
            {reason} <span className="text-caption text-muted">({items.length})</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {items.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-col gap-3 sm:flex-row">
                  <img src={api.storage.from('story-photos').getPublicUrl(r.photo_path).data.publicUrl} alt="" className="h-28 w-28 shrink-0 rounded-input object-cover" loading="lazy" />
                  <div className="flex-1">
                    <p className="text-body text-ink">{r.caption || t('sa.users.no_caption')}</p>
                    <p className="text-caption text-muted">
                      {r.author} · {r.restaurant} · {formatDateTimeIst(r.created_at)}
                    </p>
                    {r.note ? <p className="mt-1 text-caption text-ink">{r.note}</p> : null}
                    {can('moderation.manage') ? (
                      <div className="mt-3 flex gap-2">
                        <Button variant="destructive" onClick={() => resolve.mutate({ p_report_id: r.id, p_action: 'remove' })}>
                          {t('sa.users.remove')}
                        </Button>
                        <Button variant="secondary" onClick={() => resolve.mutate({ p_report_id: r.id, p_action: 'dismiss' })}>
                          {t('sa.fraud.dismiss')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
