import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from './app-text';
import { hashOf } from './hash';

const pairs: [string, string][] = [
  ['#FF9A6B', '#E8512F'],
  ['#FFC85C', '#F08A24'],
  ['#7BC8A4', '#2E8F6A'],
  ['#9A8CF0', '#5A4BC4'],
  ['#F58FA8', '#D1456B'],
];

/** Shown in place of a photo that has not been uploaded: a warm gradient with the name's initial. */
export function PhotoFallback({ name, seed, style }: { name: string; seed: string; style?: ViewStyle }) {
  const pair = pairs[hashOf(seed) % pairs.length] ?? ['#FF9A6B', '#E8512F'];
  return (
    <View style={[styles.wrap, style]} accessibilityElementsHidden>
      <LinearGradient colors={pair} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.circle} />
      <AppText variant="display" color="rgba(255,255,255,0.92)" style={styles.initial}>
        {name.slice(0, 1).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.12)', right: -60, top: -70 },
  initial: { fontSize: 64, lineHeight: 70 },
});
