import { Star } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { haptic } from './haptics';

export interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  label: string;
}

/** Large stars when editable (each is a 44 point target), compact when read-only. */
export function RatingStars({ value, onChange, size = 20, label }: RatingStarsProps) {
  const editable = onChange !== undefined;
  return (
    <View style={styles.row} accessibilityRole={editable ? 'adjustable' : 'text'} accessibilityLabel={`${label}: ${value} / 5`} accessibilityValue={{ min: 1, max: 5, now: value }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star size={size} color={n <= value ? colors.saffron500 : colors.line} fill={n <= value ? colors.saffron500 : 'transparent'} />;
        return editable ? (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}`} onPress={() => { haptic.tap(); onChange(n); }} style={styles.target} hitSlop={4}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  target: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
