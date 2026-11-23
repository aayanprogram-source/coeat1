import type { AppConfig } from '@datapal/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Icons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAppConfig, useSettings, useT } from '@/lib/config';
import { colors, pageMargin } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';

type Slide = AppConfig['onboarding_slides'][number];

function iconFor(name: string): LucideIcon {
  const key = name.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return ((Icons as unknown as Record<string, LucideIcon>)[key]) ?? Icons.Sparkles;
}

/** The value slides come from the database; with none published the first screen goes straight to sign-in. */
export function WelcomeScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const settings = useSettings();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const slides: AppConfig['onboarding_slides'] = config?.onboarding_slides ?? [];
  const last = index >= slides.length - 1;

  if (slides.length === 0) {
    const points = [t('onboarding.hero_1'), t('onboarding.hero_2'), t('onboarding.hero_3')];
    return (
      <View style={styles.heroRoot}>
        <LinearGradient colors={['#E8512F', '#C23A1B', '#7A2410']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.orbA} />
        <View style={styles.orbB} />
        <View style={styles.heroTop}>
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <AppText variant="display" color="#FFFFFF" style={styles.wordmark}>
              {settings.text('product_name')}
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(600).delay(250)}>
            <AppText color="rgba(255,255,255,0.88)" style={styles.tagline}>
              {t('onboarding.tagline')}
            </AppText>
          </Animated.View>
          <View style={styles.points}>
            {points.map((point, i) => (
              <Animated.View key={point} entering={FadeInDown.duration(500).delay(450 + i * 140)} style={styles.point}>
                <View style={styles.pointDot} />
                <AppText variant="bodyMedium" color="#FFFFFF">
                  {point}
                </AppText>
              </Animated.View>
            ))}
          </View>
        </View>
        <Animated.View entering={FadeInUp.duration(600).delay(900)} style={styles.heroFooter}>
          <Button variant="accent" label={t('onboarding.get_started')} onPress={() => router.push('/phone')} />
        </Animated.View>
      </View>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.flex}>
        {slides.length > 0 ? (
          <FlatList
            ref={list}
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.id}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => {
              const Icon = iconFor(item.icon);
              return (
                <View style={[styles.slide, { width }]}>
                  <View style={styles.badge}>
                    <Icon size={44} color={colors.green900} />
                  </View>
                  <AppText variant="display" style={styles.center}>
                    {item.title}
                  </AppText>
                  <AppText muted style={styles.center}>
                    {item.body}
                  </AppText>
                </View>
              );
            }}
          />
        ) : (
          <View style={styles.flex} />
        )}
        <View style={styles.footer}>
          {slides.length > 1 ? (
            <View style={styles.dots} accessibilityElementsHidden>
              {slides.map((s, i) => (
                <View key={s.id} style={[styles.dot, i === index ? styles.dotActive : null]} />
              ))}
            </View>
          ) : null}
          <Button label={slides.length === 0 || last ? t('onboarding.get_started') : t('common.continue')} onPress={() => (slides.length === 0 || last ? router.push('/phone') : list.current?.scrollToIndex({ index: index + 1 }))} />
          {slides.length > 0 && !last ? <Button variant="ghost" label={t('onboarding.skip')} onPress={() => router.push('/phone')} /> : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroRoot: { flex: 1, justifyContent: 'space-between' },
  orbA: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(255,255,255,0.08)', top: -90, right: -110 },
  orbB: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(247,179,43,0.18)', bottom: 120, left: -120 },
  heroTop: { paddingHorizontal: 28, paddingTop: 140, gap: 14 },
  wordmark: { fontSize: 64, lineHeight: 68, letterSpacing: -2.5 },
  tagline: { fontSize: 18, lineHeight: 27 },
  points: { marginTop: 28, gap: 14 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F7B32B' },
  heroFooter: { paddingHorizontal: 24, paddingBottom: 48 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  badge: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { padding: pageMargin, gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.saffron500, width: 20 },
});
