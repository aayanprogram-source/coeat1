export const colors = {
  green900: '#D8431F',
  green700: '#B93515',
  saffron500: '#F7B32B',
  coral500: '#EF6B4A',
  mint100: '#FDEEE6',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  ink: '#1B1713',
  muted: '#6B625A',
  line: '#ECE5DB',
  success: '#1C8F5F',
  danger: '#C2321F',
} as const;

export type ColorToken = keyof typeof colors;

export const semantic = {
  primary: colors.green900,
  primaryHover: colors.green700,
  accent: colors.saffron500,
  urgency: colors.saffron500,
  alert: colors.coral500,
  tint: colors.mint100,
  background: colors.background,
  surface: colors.surface,
  text: colors.ink,
  textMuted: colors.muted,
  border: colors.line,
  success: colors.success,
  danger: colors.danger,
  onPrimary: colors.surface,
  onAccent: colors.ink,
} as const;

export const darkSemantic: Record<keyof typeof semantic, string> = {
  primary: '#FF7A57',
  primaryHover: '#FF9B7F',
  accent: colors.saffron500,
  urgency: colors.saffron500,
  alert: colors.coral500,
  tint: '#33211A',
  background: '#14110E',
  surface: '#1E1914',
  text: '#F6F1EA',
  textMuted: '#B3A89C',
  border: '#352E27',
  success: '#4CC38A',
  danger: '#F07878',
  onPrimary: '#14110E',
  onAccent: colors.ink,
};
