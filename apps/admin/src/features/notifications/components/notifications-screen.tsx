import { formatDateTimeIst } from '@datapal/core';
import { DataTable, EmptyState, PageHeader, Tabs, useRpc, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Bell } from 'lucide-react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';
import { CampaignForm } from './campaign-form';
'use client';


interface Campaign {
  id: string;
  title: string;
  status: string;
  recipients: number;
  scheduled_at: string | null;
  created_at: string;
}
interface LogRow {
  id: string;
  event: string;
  channel: string;
  status: string;
  created_at: string;
}
interface CampaignLog {
  campaigns: Campaign[];
  log: LogRow[];
}

export function NotificationsScreen() {
  const t = useT();
  const can = useCan();
  const log = useRpc<CampaignLog>('admin_campaign_log', {});

  const campaignColumns: ColumnDef<Campaign>[] = [
    { header: t('sa.content.title'), accessorKey: 'title' },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    { header: t('sa.notifications.recipients'), accessorKey: 'recipients' },
    { header: t('common.date'), cell: ({ row }) => formatDateTimeIst(row.original.scheduled_at ?? row.original.created_at) },
  ];
  const logColumns: ColumnDef<LogRow>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateTimeIst(row.original.created_at) },
    { header: t('sa.content.event'), accessorKey: 'event' },
    { header: t('sa.notifications.channel'), accessorKey: 'channel' },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
  ];
  const empty = <EmptyState icon={Bell} title={t('sa.notifications.empty')} body={t('sa.notifications.empty_body')} />;

  return (
    <Screen permission="notifications.view">
      <PageHeader title={t('sa.nav.notifications')} />
      <Tabs
        items={[
          ...(can('notifications.send') ? [{ value: 'new', label: t('sa.notifications.broadcast'), content: <CampaignForm /> }] : []),
          { value: 'campaigns', label: t('sa.notifications.campaigns'), content: <DataTable caption={t('sa.notifications.campaigns')} columns={campaignColumns} rows={log.data?.campaigns ?? []} loading={log.isLoading} empty={empty} /> },
          { value: 'log', label: t('sa.notifications.delivery_log'), content: <DataTable caption={t('sa.notifications.delivery_log')} columns={logColumns} rows={log.data?.log ?? []} loading={log.isLoading} empty={empty} /> },
        ]}
      />
    </Screen>
  );
}
