'use client';

import { Button, cn, useApi, useT } from '@datapal/ui-web';
import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { navItems } from '@/lib/nav';
import { useAdmin, useCan } from './admin-context';

export function AppShell({ productName, children }: { productName: string; children: ReactNode }) {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const can = useCan();
  const admin = useAdmin();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await api.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const nav = (
    <nav aria-label={productName} className="flex flex-col gap-1">
      {navItems
        .filter((item) => can(item.permission))
        .map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                'group flex min-h-[44px] items-center gap-3 rounded-button px-3 text-[14.5px] font-medium transition duration-base ease-out',
                active ? 'bg-primary text-white shadow-[0_10px_24px_-8px_rgba(216,67,31,0.7)]' : 'text-white/65 hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {t(item.label)}
            </Link>
          );
        })}
    </nav>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-ink p-5 text-white md:flex md:flex-col md:justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary font-heading text-xl font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(216,67,31,0.8)]">{productName.slice(0, 1).toUpperCase()}</span>
            <p className="font-heading text-xl font-bold tracking-tight">{productName}</p>
          </div>
          {nav}
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <p className="truncate px-3 text-caption text-white/60">{admin.email}</p>
          <Button variant="ghost" className="justify-start text-white/80 hover:bg-white/10" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => void signOut()}>
            {t('common.sign_out')}
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between bg-ink px-4 py-2 text-white md:hidden">
          <p className="font-heading text-xl font-bold tracking-tight">{productName}</p>
          <Button variant="ghost" className="text-white hover:bg-white/10" aria-label={open ? t('common.close') : t('sa.nav.menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
        {open ? (
          <div className="bg-ink p-4 text-white md:hidden">
            {nav}
            <Button variant="ghost" className="mt-2 w-full" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => void signOut()}>
              {t('common.sign_out')}
            </Button>
          </div>
        ) : null}
        <main className="page-enter mx-auto w-full max-w-[1240px] px-4 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
