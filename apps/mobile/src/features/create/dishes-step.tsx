import { formatPaise } from '@datapal/core';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { RatingStars } from '@/ui/rating-stars';
import { Skeleton } from '@/ui/skeleton';

export interface DishesStepProps {
  restaurantId: string;
  ratings: Record<string, number>;
  onRatings: (next: Record<string, number>) => void;
  onNext: () => void;
}

/** Dishes come from the restaurant's live menu; each one picked gets large star controls. */
export function DishesStep({ restaurantId, ratings, onRatings, onNext }: DishesStepProps) {
  const t = useT();
  const menu = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_items').select('id, name, price_paise').eq('restaurant_id', restaurantId).eq('is_available', true).order('name');
      if (error) throw error;
      return data;
    },
  });
  const picked = Object.keys(ratings);
  const toggle = (id: string) => {
    if (id in ratings) onRatings(Object.fromEntries(Object.entries(ratings).filter(([key]) => key !== id)));
    else onRatings({ ...ratings, [id]: 5 });
  };

  return (
    <View style={styles.gap}>
      <AppText variant="h1">{t('post.pick_dishes')}</AppText>
      {menu.isLoading ? <Skeleton height={120} /> : null}
      <View style={styles.chips}>
        {(menu.data ?? []).map((d) => (
          <Chip key={d.id} label={`${d.name} · ${formatPaise(d.price_paise)}`} selected={d.id in ratings} onPress={() => toggle(d.id)} />
        ))}
      </View>
      {picked.map((id) => {
        const dish = menu.data?.find((d) => d.id === id);
        return (
          <View key={id} style={styles.rate}>
            <AppText variant="bodyMedium">{t('post.rate_dish', { dish: dish?.name ?? '' })}</AppText>
            <RatingStars value={ratings[id] ?? 0} size={36} label={dish?.name ?? ''} onChange={(value) => onRatings({ ...ratings, [id]: value })} />
          </View>
        );
      })}
      <Button label={t('common.continue')} disabled={picked.length === 0} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rate: { gap: 4, backgroundColor: colors.surface, borderRadius: radius.card, padding: 12, borderWidth: 1, borderColor: colors.line },
});
