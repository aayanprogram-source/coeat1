import type { PermissionKey } from '@datapal/core';
import type { StringKey } from '@datapal/i18n';
import {
  BadgeCheck,
  Bell,
  Building2,
  CreditCard,
  Database,
  FileText,
  Flag,
  Gauge,
  KeyRound,
  Megaphone,
  Receipt,
  ScrollText,
  Settings,
  ShieldAlert,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: StringKey;
  icon: LucideIcon;
  permission: PermissionKey;
}

export const navItems: NavItem[] = [
  { href: '/', label: 'sa.nav.overview', icon: Gauge, permission: 'overview.view' },
  { href: '/checklist', label: 'sa.nav.checklist', icon: BadgeCheck, permission: 'checklist.view' },
  { href: '/restaurants', label: 'sa.nav.restaurants', icon: Building2, permission: 'restaurants.view' },
  { href: '/offers', label: 'sa.nav.offers', icon: Tag, permission: 'offers.view' },
  { href: '/redemptions', label: 'sa.nav.redemptions', icon: Receipt, permission: 'redemptions.view' },
  { href: '/fraud', label: 'sa.nav.fraud', icon: ShieldAlert, permission: 'fraud.view' },
  { href: '/users', label: 'sa.nav.users', icon: Users, permission: 'users.view' },
  { href: '/billing', label: 'sa.nav.billing', icon: CreditCard, permission: 'billing.view' },
  { href: '/boosts', label: 'sa.nav.boosts', icon: Megaphone, permission: 'boosts.view' },
  { href: '/settings', label: 'sa.nav.settings', icon: Settings, permission: 'settings.view' },
  { href: '/content', label: 'sa.nav.content', icon: FileText, permission: 'content.view' },
  { href: '/master-data', label: 'sa.nav.master_data', icon: Database, permission: 'master_data.view' },
  { href: '/notifications', label: 'sa.nav.notifications', icon: Bell, permission: 'notifications.view' },
  { href: '/integrations', label: 'sa.nav.integrations', icon: KeyRound, permission: 'integrations.view' },
  { href: '/data-requests', label: 'sa.nav.data_requests', icon: Flag, permission: 'data_requests.view' },
  { href: '/team', label: 'sa.nav.team', icon: Users, permission: 'team.view' },
  { href: '/audit', label: 'sa.nav.audit', icon: ScrollText, permission: 'audit.view' },
];
