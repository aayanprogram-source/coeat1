'use client';

import { settingBoolean, type AppConfig } from '@datapal/core';
import { Button, Select, cn, useApi, useRpc, useT } from '@datapal/ui-web';
import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { navItems } from '@/lib/nav';
import { useRestaurant } from './restaurant-context';

export function AppShell({ productName, children }: { productName: string; children: ReactNode }) {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const { restaurant, restaurants, select } = useRestaurant();
  const config = useRpc<AppConfig>('app_config', {});
  const [open, setOpen] = useState(false);
  const sponsored = config.data ? settingBoolean(config.data, 'sponsored_enabled') : false;

  const signOut = async () => {
    await api.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const nav = (
    <nav aria-label={productName} className="flex flex-col gap-1">
      {navItems
        .filter((i) => i.roles.includes(restaurant.role) && (!i.needsSponsored || sponsored))
        .map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                'flex min-h-[44px] items-center gap-3 rounded-button px-3 text-body transition duration-fast',
                active ? 'bg-mint-100 font-medium text-green-900' : 'text-ink hover:bg-mint-100',
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {t(item.label)}
            </Link>
          );
        })}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      {restaurants.length > 1 ? (
        <Select aria-label={t('rd.shell.switch')} value={restaurant.id} onChange={(e) => select(e.target.value)}>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      ) : (
        <p className="truncate px-3 text-caption text-muted">{restaurant.name}</p>
      )}
      <Button variant="ghost" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => void signOut()}>
        {t('common.sign_out')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-line bg-surface p-4 md:flex md:flex-col md:justify-between">
        <div className="flex flex-col gap-6">
          <p className="px-3 font-heading text-h2 font-semibold text-green-900">{productName}</p>
          {nav}
        </div>
        {footer}
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2 md:hidden">
          <p className="font-heading text-h2 font-semibold text-green-900">{productName}</p>
          <Button variant="ghost" aria-label={open ? t('common.close') : t('sa.nav.menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
        {open ? (
          <div className="flex flex-col gap-4 border-b border-line bg-surface p-4 md:hidden">
            {nav}
            {footer}
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
