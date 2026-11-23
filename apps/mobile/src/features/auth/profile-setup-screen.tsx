import { handle as handleSchema, type PendingLegal } from '@datapal/core';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth';
import { useAppConfig, useSettings, useT } from '@/lib/config';
import { call, useErrorText, useRpc } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { haptic } from '@/ui/haptics';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';
import { avatarPresets, encodeAvatar, type AvatarPreset } from './avatar-presets';
import { LegalLinks } from './legal-links';

const STEPS = 4;

function Progress({ step }: { step: number }) {
  return (
    <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS, now: step + 1 }}>
      {Array.from({ length: STEPS }, (_, i) => (
        <Segment key={i} filled={i <= step} />
      ))}
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);
  fill.set(withTiming(filled ? 1 : 0, { duration: 320 }));
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

function AvatarChoice({ preset, selected, onPress }: { preset: AvatarPreset; selected: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  scale.set(withSpring(selected ? 1.12 : 1, { damping: 12, stiffness: 220 }));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={preset.emoji} onPress={onPress} style={styles.choiceCell}>
      <Animated.View style={[styles.choice, { backgroundColor: preset.bg }, selected ? styles.choiceOn : null, style]}>
        <AppText style={styles.choiceEmoji}>{preset.emoji}</AppText>
        {selected ? (
          <View style={styles.tick}>
            <Check size={12} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Four short steps (name, avatar, city, confirmations) so setup feels quick and each screen asks one thing. */
export function ProfileSetupScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const settings = useSettings();
  const { session, refreshProfile } = useAuth();
  const errorText = useErrorText();
  const pending = useRpc<PendingLegal[]>('pending_legal', { p_audience: 'customer' });
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatar, setAvatar] = useState<AvatarPreset>(avatarPresets[0] ?? { emoji: '🦊', bg: '#FFD9C7' });
  const [cityId, setCityId] = useState<string | null>(null);
  const [age, setAge] = useState(false);
  const [legal, setLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsLegal = (pending.data?.length ?? 0) > 0;
  const handleOk = handleSchema.safeParse(handle).success;
  const cities = config?.cities ?? [];
  const canNext = [name.trim().length >= 2 && handleOk, true, cityId !== null || cities.length === 0, age && (!needsLegal || legal)][step] ?? false;
  const me = { id: session?.user.id ?? 'me', name: name || null, avatar_path: encodeAvatar(avatar) };

  const next = () => {
    haptic.tap();
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (needsLegal) await call('accept_legal_documents', { p_audience: 'customer' });
      await call('complete_onboarding', { p_name: name, p_handle: handle, p_city_id: cityId, p_age_confirmed: true });
      if (session) await supabase.from('profiles').update({ avatar_path: encodeAvatar(avatar) }).eq('id', session.user.id);
      await refreshProfile();
      haptic.success();
      router.replace('/permissions');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => setStep((s) => s - 1)} style={styles.back}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <Progress step={step} />
      </View>
      <AppText variant="caption" muted>
        {t('setup.step_of', { n: step + 1, total: STEPS })}
      </AppText>

      <Animated.View key={step} entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(160)} style={styles.step}>
        {step === 0 ? (
          <>
            <AppText variant="h1">{t('setup.name_title')}</AppText>
            <AppText muted>{t('setup.name_sub')}</AppText>
            <TextField label={t('common.name')} placeholder={t('onboarding.name_placeholder')} autoComplete="name" value={name} onChangeText={setName} />
            <TextField label={t('onboarding.handle_placeholder')} hint={t('onboarding.handle_help')} autoCapitalize="none" autoCorrect={false} value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} error={handle && !handleOk ? t('onboarding.handle_rule') : undefined} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AppText variant="h1">{t('setup.avatar_title')}</AppText>
            <AppText muted>{t('setup.avatar_sub')}</AppText>
            <Animated.View entering={FadeInDown.duration(380)} style={styles.preview}>
              <Avatar person={me} size={112} />
              <AppText variant="h2">{name || t('setup.you')}</AppText>
              <AppText muted>@{handle || 'handle'}</AppText>
            </Animated.View>
            <View style={styles.grid}>
              {avatarPresets.map((p) => (
                <AvatarChoice
                  key={p.emoji}
                  preset={p}
                  selected={p.emoji === avatar.emoji}
                  onPress={() => {
                    haptic.tap();
                    setAvatar(p);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AppText variant="h1">{t('setup.city_title')}</AppText>
            <AppText muted>{t('setup.city_sub')}</AppText>
            <View style={styles.cities}>
              {cities.map((c, i) => (
                <Animated.View key={c.id} entering={FadeInDown.duration(320).delay(i * 50)}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: cityId === c.id }}
                    onPress={() => {
                      haptic.tap();
                      setCityId(c.id);
                    }}
                    style={[styles.city, cityId === c.id ? styles.cityOn : null]}
                  >
                    <View style={[styles.cityIcon, cityId === c.id ? styles.cityIconOn : null]}>
                      <MapPin size={18} color={cityId === c.id ? '#FFFFFF' : colors.green900} strokeWidth={2.2} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="h2">{c.name}</AppText>
                      <AppText variant="caption" muted>
                        {c.state}, India
                      </AppText>
                    </View>
                    {cityId === c.id ? <Check size={20} color={colors.green900} strokeWidth={3} /> : null}
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <AppText variant="h1">{t('setup.final_title')}</AppText>
            <AppText muted>{t('setup.final_sub')}</AppText>
            <View style={styles.summary}>
              <Avatar person={me} size={56} />
              <View style={styles.flex}>
                <AppText variant="h2">{name}</AppText>
                <AppText variant="caption" muted>
                  @{handle} · {cities.find((c) => c.id === cityId)?.name ?? ''}
                </AppText>
              </View>
            </View>
            <Checkbox checked={age} onChange={setAge} label={t('onboarding.age_confirm', { age: settings.number('minimum_age', 18) })} />
            {needsLegal ? (
              <View style={styles.gap}>
                <Checkbox checked={legal} onChange={setLegal} label={t('onboarding.legal_accept', { documents: (pending.data ?? []).map((d) => d.title).join(', ') })} />
                <LegalLinks documents={pending.data ?? []} />
              </View>
            ) : null}
            {error ? (
              <AppText color={colors.danger} accessibilityRole="alert">
                {error}
              </AppText>
            ) : null}
          </>
        ) : null}
      </Animated.View>

      {step < STEPS - 1 ? <Button label={t('common.continue')} disabled={!canNext} onPress={next} /> : <Button label={t('setup.create')} disabled={!canNext} loading={busy} onPress={() => void submit()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  segmentFill: { height: 5, borderRadius: 3, backgroundColor: colors.green900 },
  step: { gap: 14 },
  gap: { gap: 8 },
  flex: { flex: 1 },
  preview: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  choiceCell: { width: '25%', alignItems: 'center', paddingVertical: 8 },
  choice: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: colors.green900 },
  choiceEmoji: { fontSize: 30, lineHeight: 38 },
  tick: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.green900, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  cities: { gap: 10 },
  city: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, borderWidth: 1.5, borderColor: colors.line },
  cityOn: { borderColor: colors.green900, backgroundColor: colors.mint100 },
  cityIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  cityIconOn: { backgroundColor: colors.green900 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 },
});
