'use client';

import { formatDateTimeIst, integrationSchema, type IntegrationDefinition } from '@datapal/core';
import { Button, Card, Chip, FormField, Input, useApi, useRpcMutation, useT, useToast } from '@datapal/ui-web';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export interface IntegrationRow {
  provider: string;
  status: string;
  public_config: Record<string, string>;
  secret_hints: Record<string, string>;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
}

export function IntegrationCard({ definition, row, canManage }: { definition: IntegrationDefinition; row: IntegrationRow | undefined; canManage: boolean }) {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(row?.public_config ?? {}) }));
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const save = useRpcMutation('set_integration', { invalidate: [['rows', 'integrations'], ['rpc', 'go_live_checklist']], success: t('common.saved') });

  const needsTarget = definition.kind === 'sms' || definition.kind === 'email';
  const secrets = definition.fields.filter((f) => f.secret);
  const publicFields = definition.fields.filter((f) => !f.secret);

  const submit = () => {
    const merged: Record<string, string> = { ...values };
    const keptSecrets = secrets.filter((f) => !merged[f.name] && row?.secret_hints[f.name]);
    const check = integrationSchema(definition.provider).safeParse(
      Object.fromEntries(definition.fields.map((f) => [f.name, merged[f.name] || (keptSecrets.includes(f) ? 'kept' : '')])),
    );
    if (!check.success) {
      toast.error(t('common.invalid_value'));
      return;
    }
    const pub = Object.fromEntries(publicFields.map((f) => [f.name, merged[f.name] ?? '']));
    const sec = Object.fromEntries(secrets.filter((f) => merged[f.name]).map((f) => [f.name, merged[f.name] as string]));
    save.mutate({ p_provider: definition.provider, p_kind: definition.kind, p_public: pub, p_secrets: sec });
  };

  const test = async () => {
    setTesting(true);
    const { data, error } = await api.functions.invoke<{ ok: boolean; message: string }>('integration-test', { body: { provider: definition.provider, to: testTo || undefined } });
    setTesting(false);
    if (error || !data) toast.error(t('errors.unknown'));
    else if (data.ok) toast.success(t('sa.integrations.test_ok'));
    else toast.error(data.message);
    await Promise.all([client.invalidateQueries({ queryKey: ['rows', 'integrations'] }), client.invalidateQueries({ queryKey: ['rpc', 'go_live_checklist'] })]);
  };

  const status = row ? (row.last_test_ok === true ? 'tested' : row.last_test_ok === false ? 'failed' : 'configured') : 'missing';
  const tone = status === 'tested' ? 'success' : status === 'failed' ? 'danger' : status === 'configured' ? 'info' : 'neutral';

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-h2 font-semibold text-ink">{definition.label}</h2>
        <Chip tone={tone}>{t(`sa.integrations.status_${status}` as 'sa.integrations.status_tested')}</Chip>
      </div>
      {row?.last_test_at ? (
        <p className="text-caption text-muted">
          {formatDateTimeIst(row.last_test_at)} · {row.last_test_message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {definition.fields.map((f) => (
          <FormField key={f.name} label={f.label} optionalLabel={f.required ? undefined : `(${t('common.optional')})`} hint={f.secret && row?.secret_hints[f.name] ? t('sa.integrations.last_four', { chars: row.secret_hints[f.name] ?? '' }) : undefined}>
            <Input
              type={f.secret ? 'password' : 'text'}
              autoComplete="off"
              disabled={!canManage}
              placeholder={f.secret && row?.secret_hints[f.name] ? '••••••••' : undefined}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          </FormField>
        ))}
      </div>
      {canManage ? (
        <div className="flex flex-wrap items-end gap-3">
          <Button loading={save.isPending} onClick={submit}>
            {t('common.save')}
          </Button>
          {definition.testable && row ? (
            <>
              {needsTarget ? (
                <FormField label={t('sa.integrations.test_to')}>
                  <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={definition.kind === 'sms' ? '+91…' : 'name@example.com'} />
                </FormField>
              ) : null}
              <Button variant="secondary" loading={testing} disabled={needsTarget && !testTo} onClick={() => void test()}>
                {t('sa.integrations.test_send')}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
