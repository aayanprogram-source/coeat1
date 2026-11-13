'use client';

import { ApiProvider, ConfigListener, I18nProvider, ToastProvider } from '@datapal/ui-web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { browserClient } from './supabase-browser';

export interface DashboardProvidersProps {
  locale: string;
  overrides: Record<string, Record<string, string>>;
  children: ReactNode;
}

export function DashboardProviders({ locale, overrides, children }: DashboardProvidersProps) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }));
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries();
    router.refresh();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={browserClient()}>
        <I18nProvider locale={locale} overrides={overrides}>
          <ToastProvider>
            <ConfigListener onChange={refresh} />
            {children}
          </ToastProvider>
        </I18nProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
