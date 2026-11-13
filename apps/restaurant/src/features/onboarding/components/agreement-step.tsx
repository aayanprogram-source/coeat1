'use client';

import { Button, Card, Checkbox, Skeleton, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { useState } from 'react';

interface Agreement {
  version: number;
  title: string;
  body: string;
}

export function AgreementStep({ restaurantId, onSaved }: { restaurantId: string; onSaved: () => void }) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);
  const doc = useRows<Agreement | null>(['rows', 'merchant-agreement'], (api) => api.from('legal_documents').select('version, title, body').eq('kind', 'merchant_agreement').not('published_at', 'is', null).order('version', { ascending: false }).limit(1).maybeSingle() as never);
  const accept = useRpcMutation('accept_merchant_agreement');

  if (doc.isLoading) return <Skeleton className="h-48 w-full" />;
  if (!doc.data) return <p role="alert" className="text-body text-danger">{t('errors.integration_missing')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="font-heading text-h2 font-semibold text-ink">{doc.data.title}</h3>
        <p className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-body text-ink">{doc.data.body}</p>
      </Card>
      <Checkbox label={t('rd.onboarding.agreement_accept', { version: doc.data.version })} checked={agreed} onCheckedChange={setAgreed} />
      <Button disabled={!agreed} loading={accept.isPending} onClick={() => accept.mutate({ p_restaurant_id: restaurantId }, { onSuccess: onSaved })}>
        {t('common.continue')}
      </Button>
    </div>
  );
}
