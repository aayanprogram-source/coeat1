'use client';

import { PageHeader, Tabs, useT } from '@datapal/ui-web';
import { Screen } from '@/components/screen';
import { EntityManager } from '@/components/entity-manager';
import { faqEntity, slideEntity, templateEntity } from '@/features/master-data/entities';
import { LegalPanel } from './legal-panel';
import { TranslationsPanel } from './translations-panel';

export function ContentScreen() {
  const t = useT();
  return (
    <Screen permission="content.view">
      <PageHeader title={t('sa.nav.content')} />
      <Tabs
        items={[
          { value: 'legal', label: t('sa.content.legal'), content: <LegalPanel /> },
          { value: 'slides', label: t('sa.content.slides'), content: <EntityManager config={slideEntity} embedded /> },
          { value: 'faqs', label: t('sa.content.faqs'), content: <EntityManager config={faqEntity} embedded /> },
          { value: 'translations', label: t('sa.content.translations'), content: <TranslationsPanel /> },
          { value: 'templates', label: t('sa.content.templates'), content: <EntityManager config={templateEntity} embedded /> },
        ]}
      />
    </Screen>
  );
}
