export interface Friend extends Person {
  handle: string | null;
}

import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/app-text';
import { Avatar, type Person } from '@/ui/avatar';

export function PersonRow({ person, children }: { person: Friend; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar person={person} />
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{person.name}</AppText>
        <AppText variant="caption" muted>
          @{person.handle}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
