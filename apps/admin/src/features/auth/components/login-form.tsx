'use client';

import { email as emailSchema } from '@datapal/core';
import { Button, FormField, Input, useApi, useT } from '@datapal/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({ email: emailSchema, password: z.string().min(1) });
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(params.get('reason') === 'idle' ? t('sa.auth.idle') : null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    setMessage(null);
    const { data: wait } = await api.rpc('login_lock_seconds', { p_email: values.email });
    if (typeof wait === 'number' && wait > 0) {
      setMessage(t('sa.auth.locked', { minutes: Math.ceil(wait / 60) }));
      return;
    }
    const { data, error } = await api.auth.signInWithPassword(values);
    if (error) {
      await api.rpc('login_record', { p_email: values.email, p_success: false });
      setMessage(t('sa.auth.invalid'));
      return;
    }
    await api.rpc('login_record', { p_email: values.email, p_success: true });

    let { data: me } = await api.rpc('my_permissions');
    if (!me) {
      const name = typeof data.user.user_metadata['full_name'] === 'string' ? data.user.user_metadata['full_name'] : values.email;
      await api.rpc('claim_admin_invite', { p_name: name });
      ({ data: me } = await api.rpc('my_permissions'));
    }
    if (!me) {
      await api.auth.signOut();
      setMessage(t('sa.auth.not_staff'));
      return;
    }
    router.replace('/');
    router.refresh();
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {message ? (
        <p role="alert" className="rounded-input bg-mint-100 px-3 py-2 text-body text-ink">
          {message}
        </p>
      ) : null}
      <FormField label={t('common.email')} error={form.formState.errors.email ? t('common.invalid_email') : undefined}>
        <Input type="email" autoComplete="username" {...form.register('email')} />
      </FormField>
      <FormField label={t('common.password')} error={form.formState.errors.password ? t('common.required') : undefined}>
        <Input type="password" autoComplete="current-password" {...form.register('password')} />
      </FormField>
      <Button type="submit" loading={form.formState.isSubmitting}>
        {t('common.sign_in')}
      </Button>
    </form>
  );
}
