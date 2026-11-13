'use client';

import { permissionGroups, type PermissionKey } from '@datapal/core';
import { Button, Card, Checkbox, Dialog, FormField, Input, Skeleton, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';

interface Role {
  id: string;
  name: string;
  is_system: boolean;
}
interface RolePermission {
  role_id: string;
  permission: string;
}

export function RolesPanel() {
  const t = useT();
  const can = useCan();
  const [editing, setEditing] = useState<{ id: string | null; name: string; permissions: string[] } | null>(null);
  const roles = useRows<Role[]>(['rows', 'admin_roles'], (api) => api.from('admin_roles').select('id, name, is_system').order('name'));
  const perms = useRows<RolePermission[]>(['rows', 'role_permissions'], (api) => api.from('role_permissions').select('role_id, permission'));
  const save = useRpcMutation('save_admin_role', { invalidate: [['rows', 'admin_roles'], ['rows', 'role_permissions']], success: t('common.saved') });
  const manage = can('team.manage');

  if (roles.isLoading) return <Skeleton className="h-32 w-full" />;

  const open = (role: Role | null) =>
    setEditing({ id: role?.id ?? null, name: role?.name ?? '', permissions: (perms.data ?? []).filter((p) => p.role_id === role?.id).map((p) => p.permission) });

  const toggle = (key: PermissionKey, on: boolean) =>
    editing && setEditing({ ...editing, permissions: on ? [...editing.permissions, key] : editing.permissions.filter((p) => p !== key) });

  return (
    <div className="flex flex-col gap-4">
      {manage ? (
        <div className="flex justify-end">
          <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => open(null)}>
            {t('sa.team.new_role')}
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(roles.data ?? []).map((role) => (
          <li key={role.id}>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{role.name}</p>
                <p className="text-caption text-muted">{role.is_system ? t('sa.team.all_permissions') : t('sa.team.permission_count', { count: (perms.data ?? []).filter((p) => p.role_id === role.id).length })}</p>
              </div>
              {manage && !role.is_system ? (
                <Button variant="secondary" onClick={() => open(role)}>
                  {t('common.edit')}
                </Button>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={t('sa.team.roles')} closeLabel={t('common.close')}>
        {editing ? (
          <div className="flex flex-col gap-4">
            <FormField label={t('common.name')}>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </FormField>
            {Object.entries(permissionGroups).map(([group, keys]) => (
              <fieldset key={group}>
                <legend className="text-caption font-medium text-ink">{group}</legend>
                {keys.map((key) => (
                  <Checkbox key={key} label={key} checked={editing.permissions.includes(key)} onCheckedChange={(on) => toggle(key, on)} />
                ))}
              </fieldset>
            ))}
            <Button
              disabled={editing.name.trim().length < 2}
              loading={save.isPending}
              onClick={() => save.mutate({ p_id: editing.id ?? undefined, p_name: editing.name, p_permissions: editing.permissions }, { onSuccess: () => setEditing(null) })}
            >
              {t('common.save')}
            </Button>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
