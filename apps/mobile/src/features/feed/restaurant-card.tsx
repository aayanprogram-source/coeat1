import { formatPaise, type ExploreRestaurant } from '@datapal/core';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clock, Heart, Star, Ticket } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppConfig, useT } from '@/lib/config';
import { colors, elevation, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { PhotoFallback } from '@/ui/photo-fallback';
import { publicUrl } from '@/ui/storage-url';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function distance(m: number | null): string | null {
  if (m === null) return null;
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

/** The delivery-app style restaurant card: big photo, offer ribbon over it, rating pill and one line of facts. */
export function RestaurantCard({ restaurant, index = 0 }: { restaurant: ExploreRestaurant; index?: number }) {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const scale = useSharedValue(1);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const photo = publicUrl('restaurant-media', restaurant.cover_path ?? restaurant.logo_path);
  const offer = restaurant.offer;
  const cuisines = restaurant.cuisine_ids
    .map((id) => config?.cuisines.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 3)
    .join(' · ');
  const far = distance(restaurant.distance_m);

  return (
    <Animated.View entering={FadeInDown.duration(420).delay(Math.min(index, 6) * 70)}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={restaurant.name}
        onPress={() => router.push(`/restaurant/${restaurant.id}`)}
        onPressIn={() => {
          scale.set(withSpring(0.985, { damping: 20, stiffness: 300 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 14, stiffness: 240 }));
        }}
        style={[styles.card, press]}
      >
        <View style={styles.photoWrap}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" transition={200} /> : <PhotoFallback name={restaurant.name} seed={restaurant.id} style={styles.photo} />}
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={styles.shade} />
          <View style={styles.heart}>
            <Heart size={18} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          {offer ? (
            <View style={styles.ribbon}>
              <AppText variant="h2" color="#FFFFFF" style={styles.ribbonMain}>
                {t('common.off', { percent: offer.discount_percent })}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.9)" numeric>
                {t('common.upto', { amount: formatPaise(offer.discount_cap_paise) })}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <View style={styles.row}>
            <AppText variant="h2" numberOfLines={1} style={styles.flex}>
              {restaurant.name}
            </AppText>
            {restaurant.avg_rating ? (
              <View style={styles.rating}>
                <AppText variant="label" color="#FFFFFF" numeric>
                  {restaurant.avg_rating.toFixed(1)}
                </AppText>
                <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.row}>
            <Clock size={14} color={colors.muted} />
            <AppText variant="caption" muted numberOfLines={1} style={styles.flex}>
              {[far, cuisines || restaurant.address].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          {offer && offer.remaining !== null ? (
            <View style={[styles.row, styles.strip]}>
              <Ticket size={14} color={colors.green900} />
              <AppText variant="caption" color={colors.green700} numeric>
                {t('common.codes_left', { count: offer.remaining })} · {t('common.min_bill', { amount: formatPaise(offer.min_bill_paise) })}
              </AppText>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden', ...elevation.mid },
  photoWrap: { height: 196 },
  photo: { width: '100%', height: 196 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  heart: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  ribbon: { position: 'absolute', left: 16, bottom: 12 },
  ribbonMain: { fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  body: { padding: 16, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.success, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  strip: { marginTop: 4, backgroundColor: colors.mint100, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
