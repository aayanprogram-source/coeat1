import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSettings, useT } from '@/lib/config';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';

const tiles = [
  { emoji: '🍛', bg: '#FFE2D4', x: 0.04, y: 0.02, size: 96, rot: -8, delay: 0 },
  { emoji: '🍕', bg: '#FFF0C2', x: 0.36, y: 0.0, size: 84, rot: 6, delay: 300 },
  { emoji: '🍜', bg: '#D9F0E4', x: 0.68, y: 0.04, size: 100, rot: -5, delay: 600 },
  { emoji: '🥗', bg: '#E6E1F7', x: 0.1, y: 0.3, size: 84, rot: 7, delay: 200 },
  { emoji: '🍰', bg: '#FADCE4', x: 0.42, y: 0.27, size: 104, rot: -6, delay: 500 },
  { emoji: '🌯', bg: '#FFE9C7', x: 0.74, y: 0.31, size: 80, rot: 8, delay: 100 },
];

function Tile({ emoji, bg, x, y, size, rot, delay, width }: (typeof tiles)[number] & { width: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(delay, withRepeat(withSequence(withTiming(-9, { duration: 1800, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })), -1));
  }, [delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { rotate: `${rot}deg` }] }));
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(delay / 2)} style={[styles.tileWrap, { left: width * x, top: 190 * y * 2.6, width: size, height: size }]}>
      <Animated.View style={[styles.tile, { backgroundColor: bg, borderRadius: size * 0.3 }, style]}>
        <AppText style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{emoji}</AppText>
      </Animated.View>
    </Animated.View>
  );
}

/** The sign-in backdrop: a brand gradient, floating food tiles, the wordmark, and a white sheet that holds the form. */
export function AuthHero({ children }: { children: ReactNode }) {
  const t = useT();
  const settings = useSettings();
  const { width } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View style={[styles.root, { paddingBottom: keyboard }]}>
      <LinearGradient colors={['#E8512F', '#CB3C1B', '#8E2A12']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.orb} />
      <View style={styles.top}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.brand}>
          <AppText variant="display" color="#FFFFFF" style={styles.wordmark}>
            {settings.text('product_name')}
          </AppText>
          <AppText color="rgba(255,255,255,0.9)" style={styles.tagline}>
            {t('onboarding.tagline')}
          </AppText>
        </Animated.View>
        <View style={[styles.tiles, keyboard > 0 ? styles.tilesHidden : null]}>
          {tiles.map((tile) => (
            <Tile key={tile.emoji} {...tile} width={width - 100} />
          ))}
        </View>
      </View>
      <Animated.View entering={FadeInUp.duration(520).delay(250)} style={styles.sheet}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  orb: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,255,255,0.07)', top: -120, right: -140 },
  top: { flex: 1, paddingTop: 56 },
  brand: { paddingHorizontal: 28, gap: 6 },
  wordmark: { fontSize: 52, lineHeight: 56, letterSpacing: -2 },
  tagline: { fontSize: 16, lineHeight: 23 },
  tiles: { flex: 1, marginTop: 16 },
  tilesHidden: { opacity: 0 },
  tileWrap: { position: 'absolute' },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36, gap: 16 },
});
