import { colors, radius, shadows, spacing } from '@datapal/ui-tokens';
import type { TextStyle, ViewStyle } from 'react-native';

export { colors, radius, spacing };

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -1 },
  h1: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 33, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export const elevation = {
  low: { shadowColor: '#361F10', shadowOpacity: 0.07, shadowRadius: shadows.low.blur, shadowOffset: { width: 0, height: shadows.low.y }, elevation: 1 },
  mid: { shadowColor: '#361F10', shadowOpacity: 0.16, shadowRadius: shadows.mid.blur, shadowOffset: { width: 0, height: shadows.mid.y }, elevation: 4 },
} satisfies Record<string, ViewStyle>;

/** Numbers and money use tabular figures so counters do not jitter as they change. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const pageMargin = 20;
export const minTouch = 44;
