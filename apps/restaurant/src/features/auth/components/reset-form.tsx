'use client';

import { password as passwordSchema } from '@datapal/core';
import { Button, FormField, Input, useApi, useT } from '@datapal/ui-web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ResetForm() {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const { error } = await api.auth.updateUser({ password: value });
    setBusy(false);
    if (error) setFailed(true);
    else router.replace('/');
  };

  return (
    <div className="flex flex-col gap-4">
      {failed ? <p role="alert" className="text-body text-danger">{t('errors.unknown')}</p> : null}
      <FormField label={t('rd.auth.new_password')}>
        <Input type="password" autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />
      </FormField>
      <Button disabled={!passwordSchema.safeParse(value).success} loading={busy} onClick={() => void submit()}>
        {t('common.save')}
      </Button>
    </div>
  );
}
