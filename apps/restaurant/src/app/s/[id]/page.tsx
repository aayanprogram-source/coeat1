import { appIds, settingString } from '@datapal/core';
import { fetchAppConfig } from '@datapal/web-kit/config';
import { createTranslator } from '@datapal/i18n';

/** Where a shared story link lands when the app is not installed. It shows no story content. */
export default async function SharedStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = await fetchAppConfig();
  const { t } = createTranslator(config ? settingString(config, 'default_locale') : 'en', config?.translations ?? {});
  const product = config ? settingString(config, 'product_name') : '';
  const ios = config ? settingString(config, 'ios_store_url') : '';
  const android = config ? settingString(config, 'android_store_url') : '';
  const link = 'inline-flex min-h-[44px] items-center justify-center rounded-button px-4 text-body font-medium';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12 text-center">
      <h1 className="font-heading text-h1 font-semibold text-ink">{t('link.title', { product })}</h1>
      <p className="text-body text-muted">{t('link.body')}</p>
      <div className="flex flex-col gap-3">
        <a href={`${appIds.scheme}://s/${encodeURIComponent(id)}`} className={`${link} bg-primary text-primary-fg`}>
          {t('link.open_app')}
        </a>
        {ios ? (
          <a href={ios} className={`${link} border border-line bg-surface text-ink`}>
            {t('link.app_store')}
          </a>
        ) : null}
        {android ? (
          <a href={android} className={`${link} border border-line bg-surface text-ink`}>
            {t('link.play_store')}
          </a>
        ) : null}
      </div>
    </main>
  );
}
