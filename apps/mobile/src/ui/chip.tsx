import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { AppText } from './app-text';

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected ? styles.selected : null, pressed ? { opacity: 0.8 } : null]}
      hitSlop={{ top: 6, bottom: 6 }}
    >
      <AppText variant="label" color={selected ? '#FFFFFF' : colors.ink} style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 38, borderRadius: radius.chip, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center' },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  text: { fontSize: 13.5 },
});
