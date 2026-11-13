'use client';

import { formatDateTimeIst, validateSettingValue } from '@datapal/core';
import { Button, Dialog, Skeleton, useRows, useRpcMutation, useT } from '@datapal/ui-web';

interface HistoryRow {
  id: string;
  created_at: string;
  before: { value: unknown } | null;
  after: { value: unknown } | null;
}

/** Lists past values of one setting and rolls back to any previous one through the same validated function. */
export function SettingHistory({ settingKey, canEdit, onClose }: { settingKey: string | null; canEdit: boolean; onClose: () => void }) {
  const t = useT();
  const rows = useRows<HistoryRow[]>(
    ['setting-history', settingKey],
    (api) => api.from('audit_log').select('id, created_at, before, after').eq('entity', 'setting').eq('entity_id', settingKey ?? '').order('created_at', { ascending: false }).limit(30) as never,
    settingKey !== null,
  );
  const update = useRpcMutation('update_setting', { invalidate: [['rows', 'platform_settings'], ['setting-history', settingKey]], success: t('common.saved') });

  return (
    <Dialog open={settingKey !== null} onOpenChange={(o) => !o && onClose()} title={t('sa.settings.history')} description={settingKey ?? undefined} closeLabel={t('common.close')}>
      {rows.isLoading ? <Skeleton className="h-20 w-full" /> : null}
      {rows.data?.length === 0 ? <p className="text-body text-muted">{t('sa.settings.no_history')}</p> : null}
      <ul className="flex flex-col gap-3">
        {(rows.data ?? []).map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-input border border-line p-3">
            <div className="min-w-0 text-caption">
              <p className="text-muted">{formatDateTimeIst(row.created_at)}</p>
              <p className="truncate text-ink">
                {JSON.stringify(row.before?.value)} → {JSON.stringify(row.after?.value)}
              </p>
            </div>
            {canEdit && settingKey && row.before && validateSettingValue(settingKey, row.before.value).ok ? (
              <Button variant="secondary" loading={update.isPending} onClick={() => update.mutate({ p_key: settingKey, p_value: row.before?.value as never })}>
                {t('sa.settings.rollback')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
