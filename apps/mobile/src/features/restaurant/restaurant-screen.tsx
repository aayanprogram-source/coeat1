import { formatPaise, settingString, type OfferCard } from '@datapal/core';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mail, Navigation } from 'lucide-react-native';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { AvatarStack } from '@/ui/avatar-stack';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { CodeCard } from '@/ui/code-card';
import { ErrorState } from '@/ui/error-state';
import { RatingStars } from '@/ui/rating-stars';
import { Screen } from '@/ui/screen';
import { Skeleton } from '@/ui/skeleton';
import { publicUrl } from '@/ui/storage-url';

interface Page {
  restaurant: { id: string; name: string; address: string; lat: number; lng: number; phone: string; logo_path: string | null; cover_path: string | null };
  rating: { avg: number | null; count: number } | null;
  dishes: { id: string; name: string; price_paise: number; is_veg: boolean; avg_rating: number | null; rating_count: number | null }[];
  friends: { id: string; name: string | null; avatar_path: string | null }[];
  offer: OfferCard | null;
}

export function RestaurantScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const { id } = useLocalSearchParams<{ id: string }>();
  const page = useRpc<Page>('restaurant_page', { p_restaurant_id: id });
  const data = page.data;
  const cover = publicUrl('restaurant-media', data?.restaurant.cover_path);

  const directions = () => {
    if (!data) return;
    const { lat, lng, name } = { ...data.restaurant };
    const label = encodeURIComponent(name);
    void Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}` : `geo:${lat},${lng}?q=${lat},${lng}(${label})`);
  };
  const grievance = config ? settingString(config, 'grievance_officer_contact') : '';

  if (page.isError) return <Screen><ErrorState onRetry={() => void page.refetch()} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {cover ? <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" /> : <View style={[styles.cover, { backgroundColor: colors.mint100 }]} />}
      {!data ? (
        <Skeleton height={200} />
      ) : (
        <>
          <View style={styles.gap}>
            <AppText variant="display">{data.restaurant.name}</AppText>
            {data.rating?.avg ? (
              <View style={styles.row}>
                <RatingStars value={Math.round(data.rating.avg)} label={t('restaurant.ratings', { count: data.rating.count })} />
                <AppText variant="caption" muted numeric>
                  {data.rating.avg.toFixed(1)} · {t('restaurant.ratings', { count: data.rating.count })}
                </AppText>
              </View>
            ) : null}
            <AppText muted>{data.restaurant.address}</AppText>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button variant="secondary" icon={<Navigation size={18} color={colors.ink} />} label={t('common.directions')} onPress={directions} />
            </View>
            {grievance.includes('@') ? (
              <View style={styles.flex}>
                <Button variant="ghost" icon={<Mail size={18} color={colors.green700} />} label={t('common.report')} onPress={() => void Linking.openURL(`mailto:${grievance}?subject=${encodeURIComponent(data.restaurant.name)}`)} />
              </View>
            ) : null}
          </View>
          <View style={styles.gap}>
            <AppText variant="h2">{t('restaurant.current_offer')}</AppText>
            {data.offer ? (
              <CodeCard restaurantName={data.restaurant.name} logoPath={data.restaurant.logo_path} discountPercent={data.offer.discount_percent} capPaise={data.offer.discount_cap_paise} minBillPaise={data.offer.min_bill_paise} code={null} qrValue={null} expiresAt={data.offer.ends_at} remaining={data.offer.remaining} total={data.offer.total_codes} />
            ) : (
              <AppText muted>{t('restaurant.no_offer')}</AppText>
            )}
          </View>
          {data.friends.length > 0 ? (
            <Card style={styles.gap}>
              <AppText variant="label">{t('restaurant.friends_visited')}</AppText>
              <AvatarStack people={data.friends} />
            </Card>
          ) : null}
          <View style={styles.gap}>
            <AppText variant="h2">{t('restaurant.dishes')}</AppText>
            {data.dishes.map((d) => (
              <View key={d.id} style={styles.dish}>
                <View style={styles.flex}>
                  <AppText variant="bodyMedium">{d.name}</AppText>
                  <AppText variant="caption" muted numeric>
                    {formatPaise(d.price_paise)}
                    {d.rating_count ? ` · ${d.avg_rating} (${d.rating_count})` : ''}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 200, marginHorizontal: -16, marginTop: -16 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  dish: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingVertical: 10, borderRadius: radius.image },
});
