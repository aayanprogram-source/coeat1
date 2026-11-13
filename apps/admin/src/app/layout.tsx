import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';
import { DashboardProviders } from '@datapal/web-kit/providers';
import './globals.css';

const heading = Fraunces({ subsets: ['latin'], weight: ['600'], variable: '--font-heading', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchAppConfig();
  const name = config ? settingString(config, 'product_name') : '';
  return { title: name ? `${name} admin` : 'Admin', robots: { index: false, follow: false } };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  const config = await fetchAppConfig();
  const locale = config ? settingString(config, 'default_locale') : 'en';
  return (
    <html lang={locale} className={`${heading.variable} ${body.variable}`}>
      <body>
        <DashboardProviders locale={locale} overrides={config?.translations ?? {}}>
          {children}
        </DashboardProviders>
      </body>
    </html>
  );
}
