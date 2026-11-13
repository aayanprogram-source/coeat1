export const colors = {
  green900: '#0F3D3E',
  green700: '#1B5E5F',
  saffron500: '#F4A300',
  coral500: '#E4572E',
  mint100: '#E3F0EC',
  background: '#F6F9F8',
  surface: '#FFFFFF',
  ink: '#1F2937',
  muted: '#5B6573',
  line: '#E5E7EB',
  success: '#1E8E5A',
  danger: '#C62828',
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
  onAccent: colors.green900,
} as const;

export const darkSemantic: Record<keyof typeof semantic, string> = {
  primary: '#8FD1C8',
  primaryHover: '#B4E3DC',
  accent: colors.saffron500,
  urgency: colors.saffron500,
  alert: colors.coral500,
  tint: '#163F3F',
  background: '#0B1A1A',
  surface: '#112626',
  text: '#F3F6F5',
  textMuted: '#A3B0AE',
  border: '#24403F',
  success: '#4CC38A',
  danger: '#F07878',
  onPrimary: '#0B1A1A',
  onAccent: colors.green900,
};
