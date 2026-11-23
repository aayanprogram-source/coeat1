export interface AvatarPreset {
  emoji: string;
  bg: string;
}

export const avatarPresets: AvatarPreset[] = [
  { emoji: '🦊', bg: '#FFD9C7' },
  { emoji: '🐼', bg: '#E4E7EC' },
  { emoji: '🦁', bg: '#FFE7A8' },
  { emoji: '🐸', bg: '#CDEBD3' },
  { emoji: '🐙', bg: '#F9D3E3' },
  { emoji: '🦄', bg: '#E3D9FA' },
  { emoji: '🐯', bg: '#FFD9A8' },
  { emoji: '🐨', bg: '#D9E6F2' },
  { emoji: '🦉', bg: '#EAD9C6' },
  { emoji: '🐧', bg: '#D2E8F5' },
  { emoji: '🦋', bg: '#DDF0E6' },
  { emoji: '🍕', bg: '#FFE0C2' },
];

const PREFIX = 'preset:';

/** A chosen avatar is stored in the same text column as an uploaded photo path, marked by a prefix. */
export function encodeAvatar(preset: AvatarPreset): string {
  return `${PREFIX}${preset.emoji}:${preset.bg}`;
}

export function decodeAvatar(path: string | null | undefined): AvatarPreset | null {
  if (!path?.startsWith(PREFIX)) return null;
  const [emoji, bg] = path.slice(PREFIX.length).split(':');
  return emoji && bg ? { emoji, bg } : null;
}
