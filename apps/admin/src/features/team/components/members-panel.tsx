'use client';

import { Button, Card, Chip, FormField, Input, Select, Skeleton, invokeFunction, useApi, useRows, useRpcMutation, useT, useToast } from '@datapal/ui-web';
import { useState } from 'react';
import { useAdmin, useCan } from '@/components/admin-context';

interface Member {
  user_id: string;
  name: string;
  email: string;
  role_id: string;
  mfa_enrolled: boolean;
}
interface Role {
  id: string;
  name: string;
}

export function MembersPanel() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const can = useCan();
  const me = useAdmin();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const members = useRows<Member[]>(['rows', 'admin_users'], (a) => a.from('admin_users').select('user_id, name, email, role_id, mfa_enrolled').order('name'));
  const roles = useRows<Role[]>(['rows', 'admin_roles'], (a) => a.from('admin_roles').select('id, name').order('name'));
  const invalidate = { invalidate: [['rows', 'admin_users']], success: t('common.saved') };
  const setRole = useRpcMutation('set_admin_member', invalidate);
  const revoke = useRpcMutation('revoke_admin_sessions', { success: t('sa.team.revoked') });
  const invite = useRpcMutation('invite_admin', { success: t('sa.team.invited') });
  const manage = can('team.manage');

  const sendInvite = () =>
    invite.mutate(
      { p_email: email, p_role_id: roleId },
      {
        onSuccess: (id) => {
          void invokeFunction(api, 'send-email', { kind: 'admin_invite', id }).then((sent) => {
            if (sent === null) toast.error(t('sa.team.email_failed'));
          });
          setEmail('');
        },
      },
    );

  if (members.isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {(members.data ?? []).map((m) => (
          <li key={m.user_id}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{m.name}</p>
                  <p className="truncate text-caption text-muted">{m.email}</p>
                </div>
                <Chip tone={m.mfa_enrolled ? 'success' : 'warning'}>{m.mfa_enrolled ? t('sa.team.mfa_enrolled') : t('sa.team.mfa_pending')}</Chip>
              </div>
              {manage && m.user_id !== me.user_id ? (
                <div className="flex flex-wrap gap-2">
                  <Select aria-label={t('sa.team.roles')} value={m.role_id} onChange={(e) => setRole.mutate({ p_user_id: m.user_id, p_role_id: e.target.value })}>
                    {(roles.data ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => revoke.mutate({ p_user_id: m.user_id })}>
                    {t('sa.team.revoke_sessions')}
                  </Button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
      {manage ? (
        <Card className="flex max-w-xl flex-col gap-3">
          <h2 className="font-heading text-h2 font-semibold text-ink">{t('sa.team.invite')}</h2>
          <FormField label={t('common.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label={t('sa.team.roles')}>
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">{t('common.none')}</option>
              {(roles.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>
          <Button disabled={!email.includes('@') || !roleId} loading={invite.isPending} onClick={sendInvite}>
            {t('sa.team.invite')}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
