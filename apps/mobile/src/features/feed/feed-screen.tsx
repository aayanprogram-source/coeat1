import type { ExplorePage, FeedItem, FeedPage } from '@datapal/core';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search, Users } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Share, StyleSheet, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useAppConfig, useT } from '@/lib/config';
import { currentPosition } from '@/lib/location';
import { call } from '@/lib/rpc';
import { colors, pageMargin } from '@/lib/theme';
import { env } from '@/lib/env';
import { AppText } from '@/ui/app-text';
import { Chip } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { ErrorState } from '@/ui/error-state';
import { OfflineBanner } from '@/ui/offline-banner';
import { Skeleton } from '@/ui/skeleton';
import { CategoryRow } from './category-row';
import { OpenTableBanner } from './open-table-banner';
import { RestaurantCard } from './restaurant-card';
import { SponsoredCard } from './sponsored-card';
import { StoryCard } from './story-card';

type Filter = 'friends' | 'nearby' | 'ending_soon';

export function FeedScreen() {
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const config = useAppConfig();
  const [filter, setFilter] = useState<Filter>('friends');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const seen = useRef(new Set<string>());
  const city = config?.cities.find((c) => c.id === profile?.city_id)?.name ?? config?.cities[0]?.name ?? '';

  const feed = useInfiniteQuery({
    queryKey: ['feed', filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const position = filter === 'nearby' ? await currentPosition() : null;
      return call<FeedPage>('get_feed', { p_filter: filter, p_cursor: pageParam as never, p_lat: (position?.lat ?? undefined) as never, p_lng: (position?.lng ?? undefined) as never });
    },
    getNextPageParam: (last) => last.next_cursor,
  });
  const restaurants = useQuery({
    queryKey: ['home-restaurants', cuisine],
    queryFn: async () => {
      const position = await currentPosition();
      return call<ExplorePage>('explore_restaurants', { p_cuisine: (cuisine ?? undefined) as never, p_lat: (position?.lat ?? undefined) as never, p_lng: (position?.lng ?? undefined) as never });
    },
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const v of viewableItems) {
      const item = v.item as FeedItem;
      if (item.kind === 'sponsored' && !seen.current.has(item.placement_id)) {
        seen.current.add(item.placement_id);
        void call('record_placement_event', { p_placement_id: item.placement_id, p_kind: 'impression' }).catch(() => undefined);
      }
    }
  }, []);

  const share = (id: string) => void Share.share({ message: `https://${env.linkDomain}/s/${id}` });
  const filters: { key: Filter; label: string }[] = [
    { key: 'friends', label: t('feed.filter_friends') },
    { key: 'nearby', label: t('feed.filter_nearby') },
    { key: 'ending_soon', label: t('feed.filter_ending_soon') },
  ];

  const header = (
    <View style={styles.headerBlock}>
      <OpenTableBanner />
      <CategoryRow selected={cuisine} onSelect={setCuisine} allLabel={t('feed.all')} />
      <View style={styles.section}>
        <AppText variant="h2">{t('feed.offers_near_you')}</AppText>
        {restaurants.isLoading ? <Skeleton height={300} /> : null}
        {restaurants.isError ? <ErrorState onRetry={() => void restaurants.refetch()} /> : null}
        {(restaurants.data?.sponsored ?? []).map((s) => (
          <SponsoredCard key={s.placement_id} card={s} />
        ))}
        {(restaurants.data?.items ?? []).map((r, i) => (
          <RestaurantCard key={r.id} restaurant={r} index={i} />
        ))}
        {restaurants.data?.items.length === 0 ? <AppText muted>{t('explore.empty_body')}</AppText> : null}
      </View>
      <View style={styles.section}>
        <AppText variant="h2">{t('feed.from_friends')}</AppText>
        <View style={styles.filters}>
          {filters.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OfflineBanner />
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={city} style={styles.location}>
          <View style={styles.pin}>
            <MapPin size={18} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View>
            <View style={styles.cityRow}>
              <AppText variant="h2" style={styles.city}>
                {city || t('feed.set_city')}
              </AppText>
              <ChevronDown size={18} color={colors.ink} strokeWidth={2.4} />
            </View>
            <AppText variant="caption" muted numberOfLines={1}>
              {profile?.name ? `Hi ${profile.name.split(' ')[0] ?? ''}` : ''}
            </AppText>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.title')} onPress={() => router.push('/notifications')} style={styles.bell}>
          <Bell size={21} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="search" accessibilityLabel={t('common.search')} onPress={() => router.push('/explore')} style={styles.search}>
        <Search size={20} color={colors.green900} strokeWidth={2.4} />
        <AppText color={colors.muted} style={styles.searchText}>
          {t('feed.search_placeholder')}
        </AppText>
      </Pressable>
      {feed.isError && items.length === 0 ? (
        <ErrorState onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'story' ? item.id : `sp-${item.placement_id}`)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          renderItem={({ item }) =>
            item.kind === 'story' ? (
              <StoryCard story={item} onOpen={(id) => router.push(`/story/${id}`)} onShare={share} />
            ) : (
              <SponsoredCard card={item} />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={<RefreshControl refreshing={(feed.isRefetching || restaurants.isRefetching) && !feed.isFetchingNextPage} onRefresh={() => void Promise.all([feed.refetch(), restaurants.refetch()])} tintColor={colors.green700} />}
          onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
          onEndReachedThreshold={0.6}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          ListEmptyComponent={
            feed.isLoading ? (
              <View style={styles.sep}>
                <Skeleton height={300} />
              </View>
            ) : (
              <EmptyState
                icon={Users}
                title={t('feed.empty_title')}
                body={filter === 'nearby' ? t('feed.nearby_needs_location') : t('feed.empty_body')}
                actionLabel={t('feed.empty_cta')}
                onAction={() => void Share.share({ message: t('feed.invite_message', { name: profile?.name ?? '', link: `https://${env.linkDomain}` }) })}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: pageMargin, paddingTop: 8 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pin: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.green900, alignItems: 'center', justifyContent: 'center' },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  city: { fontSize: 19, lineHeight: 23 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#361F10', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: pageMargin, marginTop: 14, marginBottom: 10, height: 52, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, shadowColor: '#361F10', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  searchText: { fontSize: 15 },
  headerBlock: { gap: 20, marginHorizontal: -pageMargin, paddingTop: 6, paddingBottom: 18 },
  section: { gap: 14, paddingHorizontal: pageMargin },
  filters: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: pageMargin, paddingBottom: 40, flexGrow: 1 },
  sep: { gap: 18, height: 18 },
});
