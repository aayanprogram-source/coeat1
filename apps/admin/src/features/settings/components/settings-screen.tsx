'use client';

import { settingGroups, settingsRegistry } from '@datapal/core';
import { ErrorState, PageHeader, Skeleton, Tabs, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import type { StringKey } from '@datapal/i18n';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';
import { SettingHistory } from './setting-history';
import { SettingRow } from './setting-row';

export function SettingsScreen() {
  const t = useT();
  const can = useCan();
  const [history, setHistory] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const rows = useRows<{ key: string; value: unknown }[]>(['rows', 'platform_settings'], (api) => api.from('platform_settings').select('key, value'));
  const update = useRpcMutation('update_setting', { invalidate: [['rows', 'platform_settings']], success: t('common.saved') });
  const values = new Map((rows.data ?? []).map((r) => [r.key, r.value]));
  const canEdit = can('settings.manage');

  if (rows.isError) {
    return (
      <Screen permission="settings.view">
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void rows.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen permission="settings.view">
      <PageHeader title={t('sa.nav.settings')} description={t('sa.settings.intro')} />
      {rows.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Tabs
          items={settingGroups.map((group) => ({
            value: group,
            label: t(`sa.settings.group_${group}` as StringKey),
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                {settingsRegistry
                  .filter((def) => def.group === group)
                  .map((def) => (
                    <SettingRow
                      key={`${def.key}:${JSON.stringify(values.get(def.key))}`}
                      definition={def}
                      current={values.get(def.key)}
                      canEdit={canEdit}
                      saving={saving === def.key && update.isPending}
                      onSave={(value) => {
                        setSaving(def.key);
                        update.mutate({ p_key: def.key, p_value: value });
                      }}
                      onHistory={() => setHistory(def.key)}
                    />
                  ))}
              </div>
            ),
          }))}
        />
      )}
      <SettingHistory settingKey={history} canEdit={canEdit} onClose={() => setHistory(null)} />
    </Screen>
  );
}
