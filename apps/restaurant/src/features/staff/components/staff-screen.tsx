'use client';

import { staffInviteSchema } from '@datapal/core';
import { Button, Card, Chip, FormField, Input, PageHeader, Select, Skeleton, invokeFunction, useApi, useRpc, useRpcMutation, useT, useToast } from '@datapal/ui-web';
import { useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';

interface Staff {
  members: { user_id: string; email: string; role: string }[];
  invites: { id: string; email: string; role: string }[];
}

export function StaffScreen() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const { restaurant } = useRestaurant();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'cashier'>('cashier');
  const staff = useRpc<Staff>('list_staff', { p_restaurant_id: restaurant.id });
  const invalidate = [['rpc', 'list_staff']];
  const invite = useRpcMutation('invite_staff', { invalidate });
  const remove = useRpcMutation('remove_staff', { invalidate, success: t('common.saved') });
  const valid = staffInviteSchema.safeParse({ email, role }).success;

  const send = () =>
    invite.mutate(
      { p_restaurant_id: restaurant.id, p_email: email, p_role: role },
      {
        onSuccess: (id) => {
          void invokeFunction(api, 'send-email', { kind: 'restaurant_invite', id }).then((sent) => {
            if (sent === null) toast.error(t('sa.team.email_failed'));
            else toast.success(t('rd.staff.invited'));
          });
          setEmail('');
        },
      },
    );

  return (
    <RoleScreen roles={['owner']}>
      <PageHeader title={t('rd.nav.staff')} />
      <div className="flex flex-col gap-6">
        {staff.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(staff.data?.members ?? []).map((m) => (
            <li key={m.user_id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-body text-ink">{m.email}</p>
                  <Chip>{t(`rd.staff.role_${m.role}` as 'rd.staff.role_owner')}</Chip>
                </div>
                {m.role !== 'owner' ? (
                  <Button variant="ghost" onClick={() => remove.mutate({ p_restaurant_id: restaurant.id, p_user_id: m.user_id })}>
                    {t('rd.staff.remove')}
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
          {(staff.data?.invites ?? []).map((i) => (
            <li key={i.id}>
              <Card className="flex items-center justify-between gap-3">
                <p className="truncate text-body text-ink">{i.email}</p>
                <Chip tone="warning">{t('rd.staff.pending')}</Chip>
              </Card>
            </li>
          ))}
        </ul>
        <Card className="flex max-w-xl flex-col gap-3">
          <h2 className="font-heading text-h2 font-semibold text-ink">{t('rd.staff.invite')}</h2>
          <FormField label={t('common.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label={t('rd.staff.role')}>
            <Select value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'cashier')}>
              <option value="manager">{t('rd.staff.role_manager')}</option>
              <option value="cashier">{t('rd.staff.role_cashier')}</option>
            </Select>
          </FormField>
          <Button disabled={!valid} loading={invite.isPending} onClick={send}>
            {t('rd.staff.invite')}
          </Button>
        </Card>
      </div>
    </RoleScreen>
  );
}
