import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { Avatar, type Person } from './avatar';

export function AvatarStack({ people, size = 28 }: { people: Person[]; size?: number }) {
  return (
    <View style={styles.stack}>
      {people.slice(0, 4).map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size / 3, borderWidth: 2, borderColor: colors.surface, borderRadius: size }}>
          <Avatar person={p} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
});
