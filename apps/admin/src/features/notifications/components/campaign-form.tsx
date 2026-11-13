import { campaignSchema } from '@datapal/core';
import { Button, Card, FormField, Input, Select, Textarea, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { Send } from 'lucide-react';
import { useState } from 'react';

export function CampaignForm() {
  const t = useT();
  const cities = useRows<{ id: string; name: string }[]>(['rows', 'cities', 'choices'], (api) => api.from('cities').select('id, name').order('name'));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('');
  const [days, setDays] = useState('');
  const [when, setWhen] = useState('');
  const create = useRpcMutation('create_campaign', { invalidate: [['rpc', 'admin_campaign_log']], success: t('sa.notifications.queued') });
  const candidate = { title, body, city_id: city || null, active_within_days: days ? Number(days) : null, scheduled_at: when ? new Date(when).toISOString() : null };
  const valid = campaignSchema.safeParse(candidate).success;

  return (
    <Card className="flex max-w-xl flex-col gap-4">
      <FormField label={t('sa.content.title')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      </FormField>
      <FormField label={t('sa.content.body')} hint={t('sa.notifications.consent_note')}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={240} />
      </FormField>
      <FormField label={t('sa.notifications.segment_city')}>
        <Select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">{t('common.all')}</option>
          {(cities.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('sa.notifications.segment_active')} optionalLabel={`(${t('common.optional')})`}>
        <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
      </FormField>
      <FormField label={t('sa.notifications.schedule')} optionalLabel={`(${t('common.optional')})`}>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </FormField>
      <Button
        icon={<Send className="h-4 w-4" aria-hidden />}
        disabled={!valid}
        loading={create.isPending}
        onClick={() =>
          create.mutate(
            { p_title: title, p_body: body, p_city: candidate.city_id ?? undefined, p_active_within_days: candidate.active_within_days ?? undefined, p_scheduled_at: candidate.scheduled_at ?? undefined },
            { onSuccess: () => { setTitle(''); setBody(''); } },
          )
        }
      >
        {when ? t('sa.notifications.schedule') : t('sa.notifications.send_now')}
      </Button>
    </Card>
  );
}
