import { StyleSheet, View } from 'react-native';
import { AppText } from '@/ui/app-text';

export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h1" numeric>
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { alignItems: 'center' },
});
