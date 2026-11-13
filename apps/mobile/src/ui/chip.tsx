import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { AppText } from './app-text';

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : null]}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <AppText variant="label" color={selected ? colors.surface : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 36, borderRadius: radius.chip, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' },
  selected: { backgroundColor: colors.green900, borderColor: colors.green900 },
});
