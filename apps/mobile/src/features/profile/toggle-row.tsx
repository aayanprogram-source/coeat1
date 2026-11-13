import { StyleSheet, Switch, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.green700, false: colors.line }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  flex: { flex: 1 },
});
