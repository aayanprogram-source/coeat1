import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/lib/theme';

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const fraction = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const width = useSharedValue(fraction);
  useEffect(() => {
    width.value = withTiming(fraction, { duration: 250 });
  }, [fraction, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={styles.track}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.saffron500 },
});
