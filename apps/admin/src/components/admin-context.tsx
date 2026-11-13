'use client';

import type { PermissionKey } from '@datapal/core';
import { createContext, useContext, type ReactNode } from 'react';

export interface AdminProfile {
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_system: boolean;
  mfa_enrolled: boolean;
  permissions: string[];
}

const AdminContext = createContext<AdminProfile | null>(null);

export function AdminProvider({ profile, children }: { profile: AdminProfile; children: ReactNode }) {
  return <AdminContext.Provider value={profile}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminProfile {
  const profile = useContext(AdminContext);
  if (!profile) throw new Error('useAdmin must be used inside AdminProvider');
  return profile;
}

export function useCan(): (permission: PermissionKey) => boolean {
  const { is_system: isSystem, permissions } = useAdmin();
  return (permission) => isSystem || permissions.includes(permission);
}
