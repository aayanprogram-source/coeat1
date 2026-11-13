'use client';

import { rupeesToPaise, type LookupResult, type RedeemResult } from '@datapal/core';
import { errorKey } from '@datapal/i18n';
import { PageHeader, useApi, useErrorMessage, useT } from '@datapal/ui-web';
import { useCallback, useRef, useState } from 'react';
import { useRestaurant } from '@/components/restaurant-context';
import { RoleScreen } from '@/components/role-screen';
import { compressImage } from '@/lib/compress-image';
import { BillForm } from './bill-form';
import { CodeEntry } from './code-entry';
import { QrScanner } from './qr-scanner';
import { ResultPanel } from './result-panel';

type Found = Extract<LookupResult, { ok: true }>;
type Done = Extract<RedeemResult, { ok: true }>;
type Step = { name: 'enter' } | { name: 'scan' } | { name: 'bill'; found: Found } | { name: 'done'; result: Done };

export function RedeemScreen() {
  const t = useT();
  const api = useApi();
  const { restaurant } = useRestaurant();
  const errorMessage = useErrorMessage();
  const [step, setStep] = useState<Step>({ name: 'enter' });
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  const reset = useCallback(() => {
    setStep({ name: 'enter' });
    setCode('');
    setAmount('');
    setPhoto(null);
    setProblem(null);
    key.current = crypto.randomUUID();
  }, []);

  const lookup = useCallback(
    async (args: { short: string | null; id: string | null }) => {
      setBusy(true);
      setProblem(null);
      const { data, error } = await api.rpc('lookup_code', { p_restaurant_id: restaurant.id, p_short_code: args.short ?? '', ...(args.id ? { p_code_id: args.id } : {}) });
      setBusy(false);
      if (error) {
        setProblem(errorMessage(error));
        return;
      }
      const result = data as unknown as LookupResult;
      if (!result.ok) {
        setProblem(t(errorKey(result.reason)));
        setStep({ name: 'enter' });
        return;
      }
      setStep({ name: 'bill', found: result });
    },
    [api, errorMessage, restaurant.id, t],
  );

  const confirm = async (found: Found) => {
    setBusy(true);
    setProblem(null);
    try {
      let path: string | null = null;
      if (photo) {
        path = `${restaurant.id}/${crypto.randomUUID()}.jpg`;
        const upload = await api.storage.from('bill-photos').upload(path, await compressImage(photo), { contentType: 'image/jpeg' });
        if (upload.error) path = null;
      }
      const { data, error } = await api.rpc('redeem_code', {
        p_restaurant_id: restaurant.id,
        p_short_code: '',
        p_code_id: found.code_id,
        p_bill_paise: rupeesToPaise(Number(amount)),
        p_idempotency_key: key.current,
        ...(path ? { p_bill_photo_path: path } : {}),
        ...(found.visit_id ? { p_visit_id: found.visit_id } : {}),
      });
      if (error) {
        setProblem(errorMessage(error));
        return;
      }
      const result = data as unknown as RedeemResult;
      if (result.ok) setStep({ name: 'done', result });
      else {
        setProblem(t(errorKey(result.reason)));
        if (result.reason !== 'bill_below_minimum') setStep({ name: 'enter' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleScreen roles={['owner', 'manager', 'cashier']}>
      <PageHeader title={t('rd.redeem.title')} />
      <div className="mx-auto flex max-w-lg flex-col gap-4" onKeyDown={(e) => e.key === 'Escape' && step.name !== 'done' && reset()}>
        {problem ? (
          <p role="alert" className="rounded-card border border-danger bg-[#FDE7E7] p-3 text-body text-danger">
            {problem}
          </p>
        ) : null}
        {step.name === 'enter' ? (
          <CodeEntry code={code} onCode={setCode} busy={busy} onScan={() => { setProblem(null); setStep({ name: 'scan' }); }} onLookup={() => void lookup({ short: code, id: null })} />
        ) : null}
        {step.name === 'scan' ? (
          <>
            <QrScanner onCode={(id) => void lookup({ short: null, id })} onError={() => { setProblem(t('rd.redeem.camera_error')); setStep({ name: 'enter' }); }} />
            <button type="button" onClick={() => setStep({ name: 'enter' })} className="min-h-[44px] text-green-700 underline">
              {t('rd.redeem.stop_scan')}
            </button>
          </>
        ) : null}
        {step.name === 'bill' ? (
          <BillForm found={step.found} amount={amount} onAmount={setAmount} photo={photo} onPhoto={setPhoto} busy={busy} onConfirm={() => void confirm(step.found)} onCancel={reset} />
        ) : null}
        {step.name === 'done' ? <ResultPanel result={step.result} onNext={reset} /> : null}
      </div>
    </RoleScreen>
  );
}
