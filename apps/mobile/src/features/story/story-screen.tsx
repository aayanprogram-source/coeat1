import type { FeedPage, FeedStory } from '@datapal/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flag, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth';
import { useSettings, useT } from '@/lib/config';
import { call } from '@/lib/rpc';
import { colors, pageMargin } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { RatingStars } from '@/ui/rating-stars';
import { Skeleton } from '@/ui/skeleton';
import { publicUrl } from '@/ui/storage-url';
import { ReportSheet } from './report-sheet';
import { CodeSheet } from './code-sheet';
import { useOfferLive } from './use-offer-live';

export function StoryScreen() {
  const t = useT();
  const router = useRouter();
  const client = useQueryClient();
  const settings = useSettings();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [sheet, setSheet] = useState(false);
  const [report, setReport] = useState(false);
  const story = useQuery({ queryKey: ['story', id], queryFn: () => call<FeedStory>('get_story', { p_story_id: id }) });
  const data = story.data;
  useOfferLive(data?.offer?.id, id);

  const feed = client.getQueriesData<{ pages: FeedPage[] }>({ queryKey: ['feed'] }).flatMap(([, d]) => d?.pages.flatMap((p) => p.items) ?? []);
  const ids = feed.filter((i) => i.kind === 'story').map((i) => (i).id);
  const at = ids.indexOf(id);
  const go = (step: number) => {
    const next = ids[at + step];
    if (next) router.replace(`/story/${next}`);
    else if (step > 0) router.back();
  };

  const offset = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .onUpdate((e) => {
      offset.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 140) {
        offset.value = withTiming(800, { duration: 180 });
        scheduleOnRN(router.back);
      } else offset.value = withSpring(0);
    });
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }], opacity: 1 - Math.min(offset.value / 600, 0.5) }));

  if (story.isError) {
    return (
      <View style={styles.root}>
        <ErrorState onRetry={() => void story.refetch()} />
        <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
      </View>
    );
  }

  const photo = publicUrl('story-photos', data?.photo_path);
  const mine = data?.author.id === session?.user.id;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.root, animated]}>
        {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <LinearGradient colors={['rgba(15,61,62,0.55)', 'transparent', 'rgba(15,61,62,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={styles.tapRow} pointerEvents="box-none">
          <Pressable style={{ width: width * 0.3 }} onPress={() => go(-1)} accessibilityLabel={t('common.back')} accessibilityRole="button" />
          <Pressable style={{ flex: 1 }} onPress={() => go(1)} accessibilityLabel={t('common.next')} accessibilityRole="button" />
        </View>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => router.back()} style={styles.icon}>
            <X size={26} color={colors.surface} />
          </Pressable>
          {data && !mine ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.report')} onPress={() => setReport(true)} style={styles.icon}>
              <Flag size={22} color={colors.surface} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.bottom} pointerEvents="box-none">
          {!data ? (
            <Skeleton height={120} />
          ) : (
            <>
              <AppText variant="h1" color={colors.surface}>
                {data.restaurant.name}
              </AppText>
              <AppText color={colors.surface}>{t('story.author_label', { name: data.author.name ?? '' })}</AppText>
              {data.caption ? <AppText color={colors.surface}>{data.caption}</AppText> : null}
              {data.dishes.map((d) => (
                <View key={d.name} style={styles.dish}>
                  <AppText color={colors.surface} style={{ flex: 1 }}>
                    {d.name}
                  </AppText>
                  <RatingStars value={d.rating} size={16} label={d.name} />
                </View>
              ))}
              {data.has_reward ? <AppText variant="caption" color={colors.saffron500}>{t('common.shared_with_reward')}</AppText> : null}
              {data.offer && !mine ? (
                <Button
                  variant="accent"
                  label={data.my_code ? t('story.already_holding') : t('story.get_code')}
                  accessibilityHint={settings.bool('show_live_counters', true) && data.offer.remaining !== null ? t('common.codes_left', { count: data.offer.remaining }) : undefined}
                  onPress={() => setSheet(true)}
                />
              ) : null}
              {!data.offer ? <AppText variant="caption" color={colors.surface}>{t('story.expired')}</AppText> : null}
            </>
          )}
        </View>
        {data ? <CodeSheet story={data} visible={sheet} onClose={() => setSheet(false)} refetchStory={() => story.refetch()} /> : null}
        {data ? <ReportSheet storyId={data.id} visible={report} onClose={() => setReport(false)} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.green900 },
  tapRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  top: { position: 'absolute', top: 48, left: pageMargin, right: pageMargin, flexDirection: 'row', justifyContent: 'space-between' },
  icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: pageMargin, right: pageMargin, bottom: 40, gap: 8 },
  dish: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
