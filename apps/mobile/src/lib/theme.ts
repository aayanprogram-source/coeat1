import { colors, radius, shadows, spacing } from '@datapal/ui-tokens';
import type { TextStyle, ViewStyle } from 'react-native';

export { colors, radius, spacing };

export const fonts = {
  heading: 'Fraunces_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38 },
  h1: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
} satisfies Record<string, TextStyle>;

export const elevation = {
  low: { shadowColor: '#0F3D3E', shadowOpacity: 0.06, shadowRadius: shadows.low.blur, shadowOffset: { width: 0, height: shadows.low.y }, elevation: 1 },
  mid: { shadowColor: '#0F3D3E', shadowOpacity: 0.1, shadowRadius: shadows.mid.blur, shadowOffset: { width: 0, height: shadows.mid.y }, elevation: 4 },
} satisfies Record<string, ViewStyle>;

/** Numbers and money use tabular figures so counters do not jitter as they change. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const pageMargin = 16;
export const minTouch = 44;
