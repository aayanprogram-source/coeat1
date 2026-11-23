import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';
import { DashboardProviders } from '@datapal/web-kit/providers';
import './globals.css';

const heading = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-heading', display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });

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
