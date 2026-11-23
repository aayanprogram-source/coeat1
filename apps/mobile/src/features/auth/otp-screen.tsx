import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { haptic } from '@/ui/haptics';
import { OtpField } from '@/ui/otp-field';
import { AuthHero } from './auth-hero';

const RESEND_SECONDS = 30;

export function OtpScreen() {
  const t = useT();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = async (token: string) => {
    setBusy(true);
    setFailed(false);
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setBusy(false);
    if (error) {
      setFailed(true);
      setCode('');
    } else {
      haptic.success();
    }
  };

  const resend = async () => {
    setWait(RESEND_SECONDS);
    await supabase.auth.signInWithOtp({ phone });
  };

  return (
    <AuthHero>
      <View style={styles.gap}>
        <AppText variant="h1">{t('onboarding.otp_title')}</AppText>
        <AppText muted>{t('onboarding.otp_body', { phone })}</AppText>
      </View>
      <OtpField
        label={t('onboarding.otp_title')}
        value={code}
        onChange={(next) => {
          setCode(next);
          if (next.length === 6) void verify(next);
        }}
      />
      {failed ? <AppText color="#C62828" accessibilityRole="alert">{t('onboarding.otp_wrong')}</AppText> : null}
      <Button label={t('common.confirm')} disabled={code.length !== 6} loading={busy} onPress={() => void verify(code)} />
      <Button variant="ghost" label={wait > 0 ? t('onboarding.otp_resend_in', { seconds: wait }) : t('onboarding.otp_resend')} disabled={wait > 0} onPress={() => void resend()} />
    </AuthHero>
  );
}

const styles = StyleSheet.create({ gap: { gap: 8 } });
