import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from './app-text';
import { publicUrl } from './storage-url';

export interface Person {
  id: string;
  name: string | null;
  avatar_path?: string | null;
}

export function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const uri = publicUrl('avatars', person.avatar_path);
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={person.name ?? undefined}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" /> : <AppText variant="label" color={colors.green900}>{(person.name ?? '?').slice(0, 1).toUpperCase()}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
