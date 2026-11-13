import { handle as handleSchema, type PendingLegal } from '@datapal/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useAppConfig, useSettings, useT } from '@/lib/config';
import { call, useErrorText, useRpc } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Chip } from '@/ui/chip';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';
import { LegalLinks } from './legal-links';

export function ProfileSetupScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const settings = useSettings();
  const { refreshProfile } = useAuth();
  const errorText = useErrorText();
  const pending = useRpc<PendingLegal[]>('pending_legal', { p_audience: 'customer' });
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [age, setAge] = useState(false);
  const [legal, setLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsLegal = (pending.data?.length ?? 0) > 0;
  const handleOk = handleSchema.safeParse(handle).success;
  const ready = name.trim().length >= 2 && handleOk && age && (!needsLegal || legal);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (needsLegal) await call('accept_legal_documents', { p_audience: 'customer' });
      await call('complete_onboarding', { p_name: name, p_handle: handle, p_city_id: cityId, p_age_confirmed: true });
      await refreshProfile();
      router.replace('/permissions');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">{t('onboarding.name_title')}</AppText>
      <TextField label={t('common.name')} placeholder={t('onboarding.name_placeholder')} autoComplete="name" value={name} onChangeText={setName} />
      <TextField label={t('onboarding.handle_placeholder')} hint={t('onboarding.handle_help')} autoCapitalize="none" autoCorrect={false} value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} error={handle && !handleOk ? t('onboarding.handle_rule') : undefined} />
      {config && config.cities.length > 0 ? (
        <View style={styles.gap}>
          <AppText variant="label">{t('onboarding.city')}</AppText>
          <View style={styles.chips}>
            {config.cities.map((c) => (
              <Chip key={c.id} label={c.name} selected={cityId === c.id} onPress={() => setCityId(c.id)} />
            ))}
          </View>
        </View>
      ) : null}
      <Checkbox checked={age} onChange={setAge} label={t('onboarding.age_confirm', { age: settings.number('minimum_age', 18) })} />
      {needsLegal ? (
        <View style={styles.gap}>
          <Checkbox checked={legal} onChange={setLegal} label={t('onboarding.legal_accept', { documents: (pending.data ?? []).map((d) => d.title).join(', ') })} />
          <LegalLinks documents={pending.data ?? []} />
        </View>
      ) : null}
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      <Button label={t('common.continue')} disabled={!ready} loading={busy} onPress={() => void submit()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
