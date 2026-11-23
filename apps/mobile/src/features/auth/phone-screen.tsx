import { normalisePhone, phone as phoneSchema } from '@datapal/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
import { colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';

/** Sign-in is unavailable, and says so, until the SMS provider has passed its test send. */
export function PhoneScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalised = normalisePhone(raw);
  const valid = phoneSchema.safeParse(normalised).success;
  const available = config?.integrations.sms === true;

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone: normalised });
    setBusy(false);
    if (sendError) setError(t('errors.unknown'));
    else router.push({ pathname: '/otp', params: { phone: normalised } });
  };

  return (
    <Screen>
      <View style={styles.gap}>
        <AppText variant="h1">{t('onboarding.phone_title')}</AppText>
        <AppText muted>{t('onboarding.phone_body')}</AppText>
      </View>
      {!available ? (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText>{t('onboarding.signin_unavailable')}</AppText>
        </View>
      ) : null}
      <TextField label={t('common.phone')} placeholder={t('onboarding.phone_placeholder')} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" value={raw} onChangeText={setRaw} error={error ?? undefined} />
      <Button label={t('onboarding.send_code')} disabled={!valid || !available} loading={busy} onPress={() => void send()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  notice: { backgroundColor: colors.mint100, borderRadius: 16, padding: 14 },
});
