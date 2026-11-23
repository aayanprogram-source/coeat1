import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius } from '@/lib/theme';
import { AppText } from './app-text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';

const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string; glow?: string }> = {
  primary: { bg: colors.green900, fg: '#FFFFFF', glow: colors.green900 },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.green700 },
  accent: { bg: colors.saffron500, fg: colors.ink, glow: colors.saffron500 },
  destructive: { bg: colors.danger, fg: '#FFFFFF' },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon, accessibilityHint }: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={[
        styles.base,
        animated,
        { backgroundColor: p.bg, opacity: inactive ? 0.5 : 1, borderColor: p.border ?? 'transparent' },
        p.glow ? { shadowColor: p.glow, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 } : null,
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={p.fg} /> : icon}
        <AppText variant="label" color={p.fg} style={styles.label}>
          {label}
        </AppText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 54, borderRadius: radius.button, borderWidth: 1, paddingHorizontal: 20, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontSize: 15.5, letterSpacing: 0.1 },
});
