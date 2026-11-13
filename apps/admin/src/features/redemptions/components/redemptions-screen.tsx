'use client';

import { formatDateTimeIst, formatPaise } from '@datapal/core';
import { Button, DataTable, EmptyState, ErrorState, Input, PageHeader, Pagination, useApi, useRpc, useT, useToast, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Receipt, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { Screen } from '@/components/screen';
import { ReverseDialog } from './reverse-dialog';

export interface RedemptionRow {
  id: string;
  status: string;
  bill_paise: number;
  discount_paise: number;
  fee_paise: number;
  bill_photo_path: string | null;
  created_at: string;
  restaurant: string;
  customer: string;
  reversal_reason: string | null;
}

const PAGE = 25;

export function RedemptionsScreen() {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sampling, setSampling] = useState(false);
  const [reversing, setReversing] = useState<string | null>(null);
  const list = useRpc<RedemptionRow[]>('admin_redemptions', { p_search: search, p_limit: PAGE, p_offset: page * PAGE }, { enabled: !sampling });
  const sample = useRpc<RedemptionRow[]>('admin_sample_redemptions', { p_count: 10 }, { enabled: sampling });
  const query = sampling ? sample : list;

  const openPhoto = async (path: string) => {
    const { data, error } = await api.storage.from('bill-photos').createSignedUrl(path, 60);
    if (error || !data) toast.error(t('errors.unknown'));
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const columns: ColumnDef<RedemptionRow, unknown>[] = [
    { header: t('common.date'), cell: ({ row }) => formatDateTimeIst(row.original.created_at) },
    { header: t('sa.offers.restaurant'), accessorKey: 'restaurant' },
    { header: t('sa.redemptions.customer'), accessorKey: 'customer' },
    { header: t('rd.billing.subtotal'), cell: ({ row }) => formatPaise(Number(row.original.bill_paise)) },
    { header: t('rd.redeem.discount'), cell: ({ row }) => formatPaise(Number(row.original.discount_paise)) },
    { header: t('sa.redemptions.fee'), cell: ({ row }) => formatPaise(Number(row.original.fee_paise)) },
    { header: t('common.status'), cell: ({ row }) => <StatusChip status={row.original.status} /> },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.bill_photo_path ? (
            <Button variant="secondary" onClick={() => void openPhoto(row.original.bill_photo_path ?? '')}>
              {t('sa.redemptions.bill_photo')}
            </Button>
          ) : null}
          {can('redemptions.reverse') && ['pending', 'verified'].includes(row.original.status) ? (
            <Button variant="destructive" onClick={() => setReversing(row.original.id)}>
              {t('rd.redeem.reverse')}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Screen permission="redemptions.view">
      <PageHeader
        title={t('sa.nav.redemptions')}
        actions={
          <Button variant="secondary" icon={<Shuffle className="h-4 w-4" aria-hidden />} onClick={() => setSampling(!sampling)}>
            {sampling ? t('sa.redemptions.back_to_search') : t('sa.redemptions.sample')}
          </Button>
        }
      />
      {sampling ? null : (
        <div className="mb-4 max-w-sm">
          <Input type="search" placeholder={t('common.search')} aria-label={t('common.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
      )}
      {query.isError ? (
        <ErrorState title={t('common.error_title')} body={t('common.error_body')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
      ) : (
        <DataTable caption={t('sa.nav.redemptions')} columns={columns} rows={query.data ?? []} loading={query.isLoading} empty={<EmptyState icon={Receipt} title={t('sa.redemptions.empty')} body={t('sa.redemptions.empty_body')} />} />
      )}
      {sampling ? null : (
        <Pagination page={page} hasNext={(list.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
      )}
      <ReverseDialog redemptionId={reversing} onClose={() => setReversing(null)} />
    </Screen>
  );
}
