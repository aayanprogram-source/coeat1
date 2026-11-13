'use client';

import { email as emailSchema, password as passwordSchema } from '@datapal/core';
import { Button, FormField, Input, useApi, useT } from '@datapal/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({ name: z.string().trim().min(2), email: emailSchema, password: passwordSchema });
type Values = z.infer<typeof schema>;

/** For invited team members: create an account with the invited email address, then sign in. */
export function SignupForm() {
  const t = useT();
  const api = useApi();
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    const { error } = await api.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.name } },
    });
    setState(error ? 'error' : 'sent');
  });

  if (state === 'sent') return <p role="status" className="text-body text-ink">{t('sa.auth.signup_sent')}</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {state === 'error' ? <p role="alert" className="text-body text-danger">{t('errors.unknown')}</p> : null}
      <FormField label={t('common.name')} error={form.formState.errors.name ? t('common.required') : undefined}>
        <Input autoComplete="name" {...form.register('name')} />
      </FormField>
      <FormField label={t('common.email')} error={form.formState.errors.email ? t('common.invalid_email') : undefined}>
        <Input type="email" autoComplete="username" {...form.register('email')} />
      </FormField>
      <FormField label={t('common.password')} error={form.formState.errors.password ? t('sa.auth.password_rule') : undefined}>
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <Button type="submit" loading={form.formState.isSubmitting}>
        {t('sa.auth.signup_cta')}
      </Button>
    </form>
  );
}
