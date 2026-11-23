import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppConfig } from '@/lib/config';
import { colors, pageMargin } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { cuisineEmoji } from '@/ui/cuisine-emoji';

function Item({ label, emoji, selected, onPress, index }: { label: string; emoji: string; selected: boolean; onPress: () => void; index: number }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInRight.duration(380).delay(index * 50)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          scale.set(withSpring(0.92, { damping: 16, stiffness: 320 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 12, stiffness: 260 }));
        }}
        style={styles.item}
      >
        <Animated.View style={[styles.circle, selected ? styles.circleOn : null, style]}>
          <AppText style={styles.emoji}>{emoji}</AppText>
        </Animated.View>
        <AppText variant="caption" color={selected ? colors.green900 : colors.ink} style={selected ? styles.on : undefined} numberOfLines={1}>
          {label}
        </AppText>
        <View style={[styles.underline, selected ? styles.underlineOn : null]} />
      </Pressable>
    </Animated.View>
  );
}

/** Cuisine shortcuts, as in the big delivery apps: a round icon with a label, one selected at a time. */
export function CategoryRow({ selected, onSelect, allLabel }: { selected: string | null; onSelect: (id: string | null) => void; allLabel: string }) {
  const config = useAppConfig();
  const cuisines = config?.cuisines ?? [];
  if (cuisines.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Item index={0} label={allLabel} emoji="🍽️" selected={selected === null} onPress={() => onSelect(null)} />
      {cuisines.map((c, i) => (
        <Item key={c.id} index={i + 1} label={c.name} emoji={cuisineEmoji(c.name)} selected={selected === c.id} onPress={() => onSelect(selected === c.id ? null : c.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: pageMargin, gap: 14, paddingVertical: 4 },
  item: { alignItems: 'center', gap: 6, width: 74 },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  circleOn: { backgroundColor: colors.mint100, borderColor: colors.green900, borderWidth: 1.5 },
  emoji: { fontSize: 30, lineHeight: 38 },
  on: { fontFamily: 'PlusJakartaSans_700Bold' },
  underline: { height: 3, width: 24, borderRadius: 2, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: colors.green900 },
});
