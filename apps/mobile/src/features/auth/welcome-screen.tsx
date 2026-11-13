import type { AppConfig } from '@datapal/core';
import { useRouter } from 'expo-router';
import * as Icons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
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
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const slides: AppConfig['onboarding_slides'] = config?.onboarding_slides ?? [];
  const last = index >= slides.length - 1;

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
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  badge: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { padding: pageMargin, gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.saffron500, width: 20 },
});
