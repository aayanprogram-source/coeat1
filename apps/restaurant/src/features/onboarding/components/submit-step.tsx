'use client';

import { Button, Card, useRows, useRpcMutation, useT } from '@datapal/ui-web';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Summary {
  hours: Record<string, unknown[]>;
  logo_path: string | null;
  cover_path: string | null;
  merchant_agreement_accepted_at: string | null;
}

export function SubmitStep({ restaurantId }: { restaurantId: string }) {
  const t = useT();
  const router = useRouter();
  const summary = useRows<Summary>(['rows', 'onboarding-summary', restaurantId], (api) => api.from('restaurants').select('hours, logo_path, cover_path, merchant_agreement_accepted_at').eq('id', restaurantId).single() as never);
  const menu = useRows<{ id: string }[]>(['rows', 'menu_items', restaurantId], (api) => api.from('menu_items').select('id').eq('restaurant_id', restaurantId).limit(1) as never);
  const submit = useRpcMutation('submit_restaurant', { invalidate: [['rpc', 'my_restaurants']] });

  const s = summary.data;
  const checks = [
    { label: t('rd.onboarding.step_hours'), ok: s !== undefined && Object.values(s.hours).some((rows) => rows.length > 0) },
    { label: t('rd.onboarding.step_media'), ok: s !== undefined && s.logo_path !== null && s.cover_path !== null },
    { label: t('rd.onboarding.step_menu'), ok: (menu.data?.length ?? 0) > 0 },
    { label: t('rd.onboarding.step_agreement'), ok: s?.merchant_agreement_accepted_at != null },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-body text-ink">
              {c.ok ? <CircleCheck className="h-5 w-5 text-success" aria-hidden /> : <CircleAlert className="h-5 w-5 text-coral-500" aria-hidden />}
              {c.label}
            </li>
          ))}
        </ul>
      </Card>
      <Button disabled={!checks.every((c) => c.ok)} loading={submit.isPending} onClick={() => submit.mutate({ p_restaurant_id: restaurantId }, { onSuccess: () => { router.replace('/'); router.refresh(); } })}>
        {t('rd.onboarding.submit')}
      </Button>
    </div>
  );
}
