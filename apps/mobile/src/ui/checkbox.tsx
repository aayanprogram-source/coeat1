import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from './app-text';

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.row}>
      <View style={[styles.box, checked ? styles.on : null]}>{checked ? <Check size={16} color={colors.surface} /> : null}</View>
      <AppText style={styles.flex}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  flex: { flex: 1 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  on: { backgroundColor: colors.green900, borderColor: colors.green900 },
});
