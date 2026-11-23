import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { decodeAvatar } from '@/features/auth/avatar-presets';
import { colors } from '@/lib/theme';
import { AppText } from './app-text';
import { hashOf } from './hash';
import { publicUrl } from './storage-url';

export interface Person {
  id: string;
  name: string | null;
  avatar_path?: string | null;
}

const tints = ['#FDE3D6', '#FCEBC2', '#DDEFE6', '#E6E1F7', '#FADCE4'];
const tintFor = (id: string) => tints[hashOf(id) % tints.length] ?? '#FDE3D6';

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const preset = decodeAvatar(person.avatar_path);
  const uri = preset ? null : publicUrl('avatars', person.avatar_path);
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: preset?.bg ?? tintFor(person.id) }]} accessibilityLabel={person.name ?? undefined}>
      {preset ? (
        <AppText style={{ fontSize: size * 0.52, lineHeight: size * 0.66 }}>{preset.emoji}</AppText>
      ) : uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <AppText variant="label" color={colors.green700} style={{ fontSize: size * 0.4 }}>
          {(person.name ?? '?').slice(0, 1).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
