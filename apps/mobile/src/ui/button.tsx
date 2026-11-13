import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { AppText } from './app-text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';

const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.green900, fg: colors.surface },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.green700 },
  accent: { bg: colors.saffron500, fg: colors.green900 },
  destructive: { bg: colors.danger, fg: colors.surface },
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

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, icon, accessibilityHint }: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { backgroundColor: p.bg, opacity: inactive ? 0.55 : pressed ? 0.85 : 1, borderColor: p.border ?? 'transparent' }]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={p.fg} /> : icon}
        <AppText variant="label" color={p.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.button, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
