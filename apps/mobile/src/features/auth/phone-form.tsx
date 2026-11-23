import { normalisePhone, phone as phoneSchema } from '@datapal/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { colors, radius, type as typography } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';

/** Mobile number entry. Sign-in says it is unavailable until the SMS provider has passed its test send. */
export function PhoneForm() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const [raw, setRaw] = useState('');
  const [focused, setFocused] = useState(false);
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
    <>
      <View style={styles.head}>
        <AppText variant="h1">{t('onboarding.login_title')}</AppText>
        <AppText muted>{t('onboarding.phone_body')}</AppText>
      </View>
      {!available ? (
        <View style={styles.notice} accessibilityRole="alert">
          <AppText>{t('onboarding.signin_unavailable')}</AppText>
        </View>
      ) : null}
      <View>
        <View style={[styles.field, focused ? styles.focused : null, error ? styles.invalid : null]}>
          <View style={styles.prefix}>
            <AppText style={styles.flag}>🇮🇳</AppText>
            <AppText variant="label">+91</AppText>
          </View>
          <TextInput
            accessibilityLabel={t('common.phone')}
            placeholder={t('onboarding.phone_placeholder')}
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={13}
            value={raw}
            onChangeText={setRaw}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
        </View>
        {error ? (
          <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </View>
      <Button label={t('onboarding.send_code')} disabled={!valid || !available} loading={busy} onPress={() => void send()} />
      <AppText variant="caption" muted style={styles.terms}>
        {t('onboarding.terms_hint')}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: 4 },
  notice: { backgroundColor: colors.mint100, borderRadius: 16, padding: 14 },
  field: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: radius.input, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.background, overflow: 'hidden' },
  focused: { borderColor: colors.green900, backgroundColor: colors.surface },
  invalid: { borderColor: colors.danger },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: '100%', borderRightWidth: 1, borderRightColor: colors.line },
  flag: { fontSize: 18 },
  input: { ...typography.bodyMedium, flex: 1, fontSize: 17, paddingHorizontal: 14, color: colors.ink, letterSpacing: 0.5 },
  error: { marginTop: 6 },
  terms: { textAlign: 'center' },
});
