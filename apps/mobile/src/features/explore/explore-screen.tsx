import type { ExplorePage } from '@datapal/core';
import { formatPaise } from '@datapal/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Compass, Map as MapIcon, List } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppConfig, useT } from '@/lib/config';
import { currentPosition, type Position } from '@/lib/location';
import { call } from '@/lib/rpc';
import { colors, pageMargin, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Chip } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { ErrorState } from '@/ui/error-state';
import { OfflineBanner } from '@/ui/offline-banner';
import { PhotoFallback } from '@/ui/photo-fallback';
import { Skeleton } from '@/ui/skeleton';
import { TextField } from '@/ui/text-field';
import { SponsoredCard } from '../feed/sponsored-card';
import { PollsSection } from './polls-section';
import { RestaurantMap } from './restaurant-map';

export function ExploreScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    void currentPosition().then(setPosition);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const results = useQuery({
    queryKey: ['explore', debounced, cuisine, position?.lat, position?.lng],
    queryFn: () => call<ExplorePage>('explore_restaurants', { p_query: debounced, p_cuisine: (cuisine ?? undefined) as never, p_lat: (position?.lat ?? undefined) as never, p_lng: (position?.lng ?? undefined) as never }),
  });
  const mapsOn = config?.integrations.maps === true;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={results.isRefetching} onRefresh={() => void results.refetch()} tintColor={colors.green700} />}>
        <View style={styles.row}>
          <AppText variant="h1" style={styles.flex}>
            {t('explore.title')}
          </AppText>
          {mapsOn ? (
            <Pressable accessibilityRole="button" accessibilityLabel={mode === 'list' ? t('explore.map') : t('explore.list')} onPress={() => setMode(mode === 'list' ? 'map' : 'list')} style={styles.toggle}>
              {mode === 'list' ? <MapIcon size={22} color={colors.green700} /> : <List size={22} color={colors.green700} />}
            </Pressable>
          ) : null}
        </View>
        <TextField label={t('common.search')} placeholder={t('explore.search_placeholder')} value={query} onChangeText={setQuery} returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(config?.cuisines ?? []).map((c) => (
            <Chip key={c.id} label={c.name} selected={cuisine === c.id} onPress={() => setCuisine(cuisine === c.id ? null : c.id)} />
          ))}
        </ScrollView>
        {debounced === '' ? <PollsSection /> : null}
        {results.isError ? <ErrorState onRetry={() => void results.refetch()} /> : null}
        {results.isLoading ? <Skeleton height={140} /> : null}
        {mode === 'map' && mapsOn && results.data ? <RestaurantMap restaurants={results.data.items} position={position} onOpen={(id) => router.push(`/restaurant/${id}`)} /> : null}
        {mode === 'list'
          ? (
              <>
                {results.data?.sponsored.map((s) => <SponsoredCard key={s.placement_id} card={s} />)}
                {results.data?.items.map((r) => (
                  <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={r.name} onPress={() => router.push(`/restaurant/${r.id}`)} style={styles.card}>
                    <PhotoFallback name={r.name} seed={r.id} style={styles.thumb} />
                    <View style={styles.flex}>
                      <AppText variant="h2">{r.name}</AppText>
                      <AppText variant="caption" muted numeric>
                        {r.address}
                        {r.distance_m !== null ? ` · ${r.distance_m < 1000 ? `${r.distance_m} m` : `${(r.distance_m / 1000).toFixed(1)} km`}` : ''}
                      </AppText>
                      {r.offer ? (
                        <AppText variant="label" color={colors.green700} numeric>
                          {t('common.off', { percent: r.offer.discount_percent })} · {t('common.upto', { amount: formatPaise(r.offer.discount_cap_paise) })}
                        </AppText>
                      ) : null}
                    </View>
                    {r.avg_rating ? (
                      <View style={styles.rating}>
                        <AppText variant="label" color="#FFFFFF" numeric>
                          {r.avg_rating.toFixed(1)}
                        </AppText>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
                {results.data?.items.length === 0 ? <EmptyState icon={Compass} title={t('explore.empty_title')} body={t('explore.empty_body')} /> : null}
              </>
            )
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: pageMargin, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  toggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, minHeight: 88, padding: 12, shadowColor: '#361F10', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  thumb: { width: 64, height: 64, borderRadius: 16 },
  rating: { backgroundColor: colors.success, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
});
