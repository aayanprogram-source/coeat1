import type { FeedItem, FeedPage } from '@datapal/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bell, Users } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Share, StyleSheet, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useSettings, useT } from '@/lib/config';
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
import { OpenTableBanner } from './open-table-banner';
import { SponsoredCard } from './sponsored-card';
import { StoryCard } from './story-card';

type Filter = 'friends' | 'nearby' | 'ending_soon';

export function FeedScreen() {
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const settings = useSettings();
  const [filter, setFilter] = useState<Filter>('friends');
  const seen = useRef(new Set<string>());

  const feed = useInfiniteQuery({
    queryKey: ['feed', filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const position = filter === 'nearby' ? await currentPosition() : null;
      return call<FeedPage>('get_feed', { p_filter: filter, p_cursor: pageParam as never, p_lat: (position?.lat ?? undefined) as never, p_lng: (position?.lng ?? undefined) as never });
    },
    getNextPageParam: (last) => last.next_cursor,
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OfflineBanner />
      <View style={styles.header}>
        <View>
          <AppText variant="caption" muted>
            {profile?.name ? `Hi ${profile.name.split(' ')[0] ?? ''}` : ''}
          </AppText>
          <AppText variant="display" style={styles.brand}>
            {settings.text('product_name')}
            <AppText variant="display" color={colors.green900} style={styles.brand}>
              .
            </AppText>
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.title')} onPress={() => router.push('/notifications')} style={styles.bell}>
          <Bell size={21} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>
      <View style={styles.filters}>
        {filters.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>
      {feed.isError && items.length === 0 ? (
        <ErrorState onRetry={() => void feed.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'story' ? item.id : `sp-${item.placement_id}`)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<OpenTableBanner />}
          renderItem={({ item }) =>
            item.kind === 'story' ? (
              <StoryCard story={item} onOpen={(id) => router.push(`/story/${id}`)} onShare={share} />
            ) : (
              <SponsoredCard card={item} />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.green700} />}
          onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && void feed.fetchNextPage()}
          onEndReachedThreshold={0.6}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          ListEmptyComponent={
            feed.isLoading ? (
              <View style={styles.sep}>
                <Skeleton height={360} />
                <Skeleton height={360} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: pageMargin, paddingTop: 10 },
  bell: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#361F10', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  brand: { fontSize: 32, lineHeight: 36 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: pageMargin, paddingVertical: 12 },
  list: { paddingHorizontal: pageMargin, paddingBottom: 32, flexGrow: 1 },
  sep: { gap: 18 },
});
