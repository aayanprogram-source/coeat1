'use client';

import { stringKeys, baseStrings, type StringKey } from '@datapal/i18n';
import { Button, Card, FormField, Input, Skeleton, useRows, useRpc, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';

const SHOWN = 40;

export function TranslationsPanel() {
  const t = useT();
  const can = useCan();
  const [locale, setLocale] = useState('en');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const overrides = useRows<{ key: string; value: string }[]>(['rows', 'translations', locale], (api) => api.from('translations').select('key, value').eq('locale', locale) as never);
  const missing = useRpc<string[]>('missing_translation_keys', { p_locale: locale, p_keys: stringKeys });
  const invalidate = [['rows', 'translations'], ['rpc', 'missing_translation_keys'], ['rpc', 'app_config']];
  const save = useRpcMutation('save_translation', { invalidate, success: t('common.saved') });
  const remove = useRpcMutation('delete_translation', { invalidate, success: t('common.deleted') });
  const byKey = new Map((overrides.data ?? []).map((o) => [o.key, o.value]));
  const visible = stringKeys.filter((k) => !search || k.includes(search) || baseStrings[k].toLowerCase().includes(search.toLowerCase())).slice(0, SHOWN);
  const manage = can('content.manage');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <FormField label={t('sa.content.locale')} hint={t('sa.content.locale_hint')}>
          <Input value={locale} onChange={(e) => setLocale(e.target.value)} />
        </FormField>
        <FormField label={t('common.search')}>
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </FormField>
      </div>
      <Card>
        <p className="font-medium text-ink">{t('sa.content.missing_keys', { locale })}</p>
        {missing.isLoading ? <Skeleton className="mt-2 h-5 w-24" /> : <p className="text-caption text-muted tabular-nums">{t('sa.content.missing_count', { missing: missing.data?.length ?? 0, total: stringKeys.length })}</p>}
      </Card>
      <ul className="flex flex-col gap-3">
        {visible.map((key) => {
          const override = byKey.get(key);
          const value = drafts[key] ?? override ?? '';
          return (
            <li key={key}>
              <Card className="flex flex-col gap-2">
                <p className="break-all text-caption text-muted">{key}</p>
                <p className="text-body text-ink">{baseStrings[key as StringKey]}</p>
                <FormField label={t('sa.content.override')}>
                  <Input value={value} disabled={!manage} onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })} />
                </FormField>
                {manage ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled={!value.trim() || value === override} loading={save.isPending && save.variables?.p_key === key} onClick={() => save.mutate({ p_key: key, p_locale: locale, p_value: value })}>
                      {t('common.save')}
                    </Button>
                    {override !== undefined ? (
                      <Button variant="ghost" onClick={() => remove.mutate({ p_key: key, p_locale: locale })}>
                        {t('sa.content.remove_override')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
      {visible.length === SHOWN ? <p className="text-caption text-muted">{t('sa.content.refine_search')}</p> : null}
    </div>
  );
}
