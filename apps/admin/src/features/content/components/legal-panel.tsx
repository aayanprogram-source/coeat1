'use client';

import { formatDateTimeIst, legalDocumentKinds, legalDocumentSchema, type LegalDocumentKind } from '@datapal/core';
import { Button, Card, Chip, FormField, Input, Select, Skeleton, Textarea, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { useCan } from '@/components/admin-context';
import { DiffView } from './diff-view';

interface Doc {
  id: string;
  kind: string;
  version: number;
  title: string;
  body: string;
  published_at: string | null;
}

export function LegalPanel() {
  const t = useT();
  const can = useCan();
  const [kind, setKind] = useState<LegalDocumentKind>('terms');
  const [showDiff, setShowDiff] = useState(false);
  const [edits, setEdits] = useState<Record<string, { title: string; body: string }>>({});
  const docs = useRows<Doc[]>(['rows', 'legal_documents'], (api) => api.from('legal_documents').select('*').order('version', { ascending: false }) as never);
  const invalidate = [['rows', 'legal_documents'], ['rpc', 'app_config']];
  const save = useRpcMutation('save_legal_draft', { invalidate, success: t('common.saved') });
  const publish = useRpcMutation('publish_legal_document', { invalidate, success: t('sa.content.published_ok') });

  const ofKind = (docs.data ?? []).filter((d) => d.kind === kind);
  const published = ofKind.find((d) => d.published_at !== null);
  const draft = ofKind.find((d) => d.published_at === null);
  const current = edits[kind] ?? { title: draft?.title ?? published?.title ?? '', body: draft?.body ?? published?.body ?? '' };
  const valid = legalDocumentSchema.safeParse({ kind, ...current }).success;
  const manage = can('content.manage');

  if (docs.isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <FormField label={t('sa.content.document')}>
          <Select value={kind} onChange={(e) => { setKind(e.target.value as LegalDocumentKind); setShowDiff(false); }}>
            {legalDocumentKinds.map((k) => (
              <option key={k} value={k}>
                {k.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('sa.content.title')}>
          <Input value={current.title} disabled={!manage} onChange={(e) => setEdits({ ...edits, [kind]: { ...current, title: e.target.value } })} />
        </FormField>
        <FormField label={t('sa.content.body')}>
          <Textarea className="min-h-[320px] font-mono" value={current.body} disabled={!manage} onChange={(e) => setEdits({ ...edits, [kind]: { ...current, body: e.target.value } })} />
        </FormField>
        {manage ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!valid} loading={save.isPending} onClick={() => save.mutate({ p_kind: kind, p_title: current.title, p_body: current.body })}>
              {t('sa.content.save_draft')}
            </Button>
            <Button variant="ghost" disabled={!published} onClick={() => setShowDiff(!showDiff)}>
              {t('sa.content.diff')}
            </Button>
            <Button disabled={!draft} loading={publish.isPending} onClick={() => publish.mutate({ p_kind: kind })}>
              {t('sa.content.publish')}
            </Button>
          </div>
        ) : null}
        {showDiff && published ? <DiffView before={published.body} after={current.body} /> : null}
      </div>
      <Card className="flex flex-col gap-3 self-start">
        <h3 className="font-medium text-ink">{t('sa.content.versions')}</h3>
        {ofKind.length === 0 ? <p className="text-caption text-muted">{t('sa.content.no_versions')}</p> : null}
        <ul className="flex flex-col gap-2">
          {ofKind.map((d) => (
            <li key={d.id} className="flex items-center justify-between text-caption">
              <span>v{d.version}</span>
              {d.published_at ? <span className="text-muted">{formatDateTimeIst(d.published_at)}</span> : <Chip tone="warning">{t('sa.content.draft')}</Chip>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
