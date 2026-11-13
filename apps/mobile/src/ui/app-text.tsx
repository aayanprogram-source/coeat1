import { Text, type TextProps } from 'react-native';
import { colors, tabular, type as typography } from '@/lib/theme';

export type TextVariant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  numeric?: boolean;
}

/** All text goes through here so type scale, colour and dynamic text sizes stay consistent. */
export function AppText({ variant = 'body', muted = false, color, numeric = false, style, ...rest }: AppTextProps) {
  return <Text allowFontScaling maxFontSizeMultiplier={1.6} style={[typography[variant], { color: color ?? (muted ? colors.muted : colors.ink) }, numeric ? tabular : null, style]} {...rest} />;
}
