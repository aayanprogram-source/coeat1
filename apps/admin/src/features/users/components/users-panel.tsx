'use client';

import { formatDateIst } from '@datapal/core';
import { Button, DataTable, EmptyState, Input, Pagination, useRpc, useRpcMutation, useT, StatusChip } from '@datapal/ui-web';
import type { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';

interface UserRow {
  id: string;
  name: string | null;
  handle: string | null;
  phone: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

const PAGE = 25;

export function UsersPanel() {
  const t = useT();
  const can = useCan();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const query = useRpc<UserRow[]>('admin_search_users', { p_query: search, p_limit: PAGE, p_offset: page * PAGE });
  const suspend = useRpcMutation('set_user_suspended', { invalidate: [['rpc', 'admin_search_users']], success: t('common.saved') });

  const columns: ColumnDef<UserRow>[] = [
    { header: t('common.name'), cell: ({ row }) => row.original.name ?? '-' },
    { header: t('sa.users.handle'), cell: ({ row }) => row.original.handle ?? '-' },
    { header: t('common.phone'), cell: ({ row }) => row.original.phone ?? '-' },
    { header: t('common.date'), cell: ({ row }) => formatDateIst(row.original.created_at) },
    {
      header: t('common.status'),
      cell: ({ row }) => <StatusChip status={row.original.deleted_at ? 'rejected' : row.original.suspended_at ? 'suspended' : 'active'} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) =>
        can('users.manage') && !row.original.deleted_at ? (
          <Button variant={row.original.suspended_at ? 'secondary' : 'destructive'} onClick={() => suspend.mutate({ p_user_id: row.original.id, p_suspended: !row.original.suspended_at })}>
            {row.original.suspended_at ? t('sa.restaurants.reinstate') : t('sa.restaurants.suspend')}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <Input type="search" placeholder={t('common.search')} aria-label={t('common.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>
      <DataTable caption={t('sa.users.users')} columns={columns} rows={query.data ?? []} loading={query.isLoading} empty={<EmptyState icon={Users} title={t('sa.users.empty')} body={t('sa.users.empty_body')} />} />
      <Pagination page={page} hasNext={(query.data?.length ?? 0) === PAGE} onPage={setPage} previousLabel={t('common.previous')} nextLabel={t('common.next')} pageLabel={t('common.page', { page: page + 1 })} />
    </div>
  );
}
