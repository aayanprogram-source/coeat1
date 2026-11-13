'use client';

import { email as emailSchema, password as passwordSchema } from '@datapal/core';
import { Button, FormField, Input, useApi, useT } from '@datapal/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({ email: emailSchema, password: passwordSchema });
type Values = z.infer<typeof schema>;

export function SignupForm() {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'confirm' | 'error'>('idle');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    const { data, error } = await api.auth.signUp(values);
    if (error) {
      setState('error');
      return;
    }
    if (data.session) {
      router.replace('/');
      router.refresh();
    } else {
      setState('confirm');
    }
  });

  if (state === 'confirm') return <p role="status" className="text-body text-ink">{t('sa.auth.signup_sent')}</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {state === 'error' ? <p role="alert" className="text-body text-danger">{t('errors.unknown')}</p> : null}
      <FormField label={t('common.email')} error={form.formState.errors.email ? t('common.invalid_email') : undefined}>
        <Input type="email" autoComplete="username" {...form.register('email')} />
      </FormField>
      <FormField label={t('common.password')} error={form.formState.errors.password ? t('sa.auth.password_rule') : undefined}>
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <Button type="submit" loading={form.formState.isSubmitting}>
        {t('rd.auth.create')}
      </Button>
      <p className="text-caption text-muted">
        {t('rd.auth.have_account')}{' '}
        <Link href="/login" className="text-green-700 underline">
          {t('common.sign_in')}
        </Link>
      </p>
    </form>
  );
}
