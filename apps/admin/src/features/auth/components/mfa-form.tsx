'use client';

import { Button, FormField, Input, Spinner, useApi, useErrorMessage, useT } from '@datapal/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Enrollment {
  factorId: string;
  qr: string;
  secret: string;
}

/** Two-factor is mandatory: enrol a TOTP factor on first sign-in, then verify it on every later one. */
export function MfaForm() {
  const t = useT();
  const api = useApi();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<unknown>(null);
  const [wrongCode, setWrongCode] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: factors } = await api.auth.mfa.listFactors();
      const verified = factors?.totp.find((f) => f.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        return;
      }
      for (const stale of factors?.all ?? []) await api.auth.mfa.unenroll({ factorId: stale.id });
      const { data, error: enrolError } = await api.auth.mfa.enroll({ factorType: 'totp' });
      if (enrolError || !data) {
        setFailure(enrolError);
        return;
      }
      setFactorId(data.id);
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [api]);

  const verify = async () => {
    if (!factorId) return;
    setBusy(true);
    setWrongCode(false);
    const { error: verifyError } = await api.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (verifyError) {
      setBusy(false);
      setWrongCode(true);
      return;
    }
    await api.rpc('sync_mfa');
    router.replace('/');
    router.refresh();
  };

  if (!factorId && !failure) return <Spinner label={t('common.loading')} />;

  return (
    <div className="flex flex-col gap-4">
      {enrollment ? (
        <>
          <p className="text-body text-muted">{t('sa.auth.mfa_enrol_body')}</p>
          <img src={enrollment.qr} alt={t('sa.auth.mfa_qr')} className="mx-auto h-44 w-44" />
          <p className="break-all text-center text-caption text-muted">{enrollment.secret}</p>
        </>
      ) : null}
      {failure || wrongCode ? (
        <p role="alert" className="text-body text-danger">
          {wrongCode ? t('sa.auth.mfa_wrong') : errorMessage(failure)}
        </p>
      ) : null}
      <FormField label={t('sa.auth.mfa_code')}>
        <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
      </FormField>
      <Button onClick={() => void verify()} loading={busy} disabled={code.trim().length !== 6}>
        {t('sa.auth.mfa_verify')}
      </Button>
    </div>
  );
}
