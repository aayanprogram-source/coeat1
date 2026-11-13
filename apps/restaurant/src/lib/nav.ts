import type { RestaurantRole } from '@datapal/core';
import type { StringKey } from '@datapal/i18n';
import { Award, CreditCard, Gauge, Megaphone, ScanLine, Settings, Star, Tag, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: StringKey;
  icon: LucideIcon;
  roles: RestaurantRole[];
  /** Hidden unless the platform has switched sponsored placements on. */
  needsSponsored?: boolean;
}

const all: RestaurantRole[] = ['owner', 'manager', 'cashier'];

export const navItems: NavItem[] = [
  { href: '/', label: 'rd.nav.overview', icon: Gauge, roles: ['owner', 'manager'] },
  { href: '/redeem', label: 'rd.nav.redeem', icon: ScanLine, roles: all },
  { href: '/offers', label: 'rd.nav.offers', icon: Tag, roles: ['owner', 'manager'] },
  { href: '/promoters', label: 'rd.nav.promoters', icon: Award, roles: ['owner', 'manager'] },
  { href: '/reviews', label: 'rd.nav.reviews', icon: Star, roles: ['owner', 'manager'] },
  { href: '/boosts', label: 'rd.nav.boosts', icon: Megaphone, roles: ['owner', 'manager'], needsSponsored: true },
  { href: '/billing', label: 'rd.nav.billing', icon: CreditCard, roles: ['owner'] },
  { href: '/staff', label: 'rd.nav.staff', icon: Users, roles: ['owner'] },
  { href: '/settings', label: 'rd.nav.settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function allowedPaths(role: RestaurantRole): string[] {
  return navItems.filter((i) => i.roles.includes(role)).map((i) => i.href);
}
