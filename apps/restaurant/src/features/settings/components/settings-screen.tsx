'use client';

import { formatDateIst, weeklyHours, type WeeklyHours } from '@datapal/core';
import { Button, Card, FormField, Input, PageHeader, Skeleton, Switch, Tabs, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { useEffect, useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { WeeklyHoursEditor } from '@/components/weekly-hours-editor';

interface Profile {
  name: string;
  address: string;
  phone: string;
  upi_id: string | null;
  hours: WeeklyHours;
  notifications_enabled: boolean;
  merchant_agreement_version: number | null;
  merchant_agreement_accepted_at: string | null;
}

export function SettingsScreen() {
  const t = useT();
  const { restaurant } = useRestaurant();
  const profile = useRows<Profile>(['rows', 'restaurant-profile', restaurant.id], (api) =>
    api.from('restaurants').select('name, address, phone, upi_id, hours, notifications_enabled, merchant_agreement_version, merchant_agreement_accepted_at').eq('id', restaurant.id).single() as never,
  );
  const save = useRpcMutation('update_restaurant', { invalidate: [['rows', 'restaurant-profile'], ['rpc', 'my_restaurants']], success: t('common.saved') });
  const [draft, setDraft] = useState<Profile | null>(null);

  useEffect(() => {
    if (profile.data) setDraft(profile.data);
  }, [profile.data]);

  if (!draft) {
    return (
      <RoleScreen roles={['owner', 'manager']}>
        <Skeleton className="h-48 w-full" />
      </RoleScreen>
    );
  }

  const patch = (data: Record<string, unknown>) => save.mutate({ p_restaurant_id: restaurant.id, p_details: data });
  const hoursValid = weeklyHours.safeParse(draft.hours).success;

  return (
    <RoleScreen roles={['owner', 'manager']}>
      <PageHeader title={t('rd.nav.settings')} />
      <Tabs
        items={[
          {
            value: 'profile',
            label: t('rd.settings.profile'),
            content: (
              <Card className="flex max-w-xl flex-col gap-4">
                <FormField label={t('common.name')}>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </FormField>
                <FormField label={t('rd.onboarding.address')}>
                  <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                </FormField>
                <FormField label={t('common.phone')}>
                  <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </FormField>
                <FormField label={t('rd.settings.upi')}>
                  <Input value={draft.upi_id ?? ''} onChange={(e) => setDraft({ ...draft, upi_id: e.target.value })} />
                </FormField>
                <Button loading={save.isPending} onClick={() => patch({ name: draft.name, address: draft.address, phone: draft.phone, upi_id: draft.upi_id ?? '' })}>
                  {t('common.save')}
                </Button>
              </Card>
            ),
          },
          {
            value: 'hours',
            label: t('rd.settings.hours'),
            content: (
              <Card className="flex flex-col gap-4">
                <WeeklyHoursEditor value={draft.hours} onChange={(hours) => setDraft({ ...draft, hours })} />
                <Button disabled={!hoursValid} loading={save.isPending} onClick={() => patch({ hours: draft.hours })} className="self-start">
                  {t('common.save')}
                </Button>
              </Card>
            ),
          },
          {
            value: 'notifications',
            label: t('rd.settings.notifications'),
            content: (
              <Card>
                <Switch label={t('rd.settings.notify_on')} checked={draft.notifications_enabled} onCheckedChange={(v) => { setDraft({ ...draft, notifications_enabled: v }); patch({ notifications_enabled: v }); }} />
              </Card>
            ),
          },
          {
            value: 'agreement',
            label: t('rd.settings.agreement'),
            content: (
              <Card>
                <p className="text-body text-ink">
                  {draft.merchant_agreement_version && draft.merchant_agreement_accepted_at
                    ? t('rd.settings.agreement_accepted', { version: draft.merchant_agreement_version, date: formatDateIst(draft.merchant_agreement_accepted_at) })
                    : t('rd.settings.agreement_missing')}
                </p>
              </Card>
            ),
          },
        ]}
      />
    </RoleScreen>
  );
}
