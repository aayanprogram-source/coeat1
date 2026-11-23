import type { FeedStory } from '@datapal/core';
import { Image } from 'expo-image';
import { Share2, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSettings, useT } from '@/lib/config';
import { colors, elevation, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Chip } from '@/ui/chip';
import { CodeCard } from '@/ui/code-card';
import { RatingStars } from '@/ui/rating-stars';
import { PhotoFallback } from '@/ui/photo-fallback';
import { publicUrl } from '@/ui/storage-url';

export interface StoryCardProps {
  story: FeedStory;
  onOpen: (id: string) => void;
  onShare: (id: string) => void;
}

/** A friend's story as a large card: photo, dishes with ratings and the code strip with a live counter. */
export function StoryCard({ story, onOpen, onShare }: StoryCardProps) {
  const t = useT();
  const settings = useSettings();
  const photo = publicUrl('story-photos', story.photo_path);
  const offer = story.offer;

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('feed.open_story', { name: story.author.name ?? '' })} onPress={() => onOpen(story.id)}>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" transition={200} /> : <PhotoFallback name={story.restaurant.name} seed={story.restaurant.id} style={styles.photo} />}
      </Pressable>
      <View style={styles.body}>
        <View style={styles.row}>
          <Avatar person={{ id: story.author.id, name: story.author.name, avatar_path: story.author.avatar_path }} size={32} />
          <View style={styles.flex}>
            <AppText variant="label">{story.author.name}</AppText>
            <AppText variant="caption" muted>
              {t('story.author_label', { name: story.restaurant.name })}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.share')} onPress={() => onShare(story.id)} style={styles.icon} hitSlop={6}>
            <Share2 size={20} color={colors.green700} />
          </Pressable>
        </View>
        <View style={styles.dishes}>
          {story.dishes.map((d) => (
            <View key={d.name} style={styles.row}>
              <AppText variant="body" style={styles.flex} numberOfLines={1}>
                {d.name}
              </AppText>
              <RatingStars value={d.rating} size={16} label={d.name} />
            </View>
          ))}
        </View>
        <View style={styles.tags}>
          {story.verified ? <Chip label={t('common.verified_diner')} /> : null}
          {story.has_reward ? <Chip label={t('common.shared_with_reward')} /> : null}
        </View>
        {offer ? (
          <CodeCard
            restaurantName={story.restaurant.name}
            logoPath={story.restaurant.logo_path}
            discountPercent={offer.discount_percent}
            capPaise={offer.discount_cap_paise}
            minBillPaise={offer.min_bill_paise}
            code={null}
            qrValue={null}
            expiresAt={offer.ends_at}
            remaining={settings.bool('show_live_counters', true) ? offer.remaining : null}
            total={offer.total_codes}
          />
        ) : null}
        {story.my_code ? (
          <View style={styles.row}>
            <ShieldCheck size={16} color={colors.success} />
            <AppText variant="caption" color={colors.success}>
              {t('story.already_holding')}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden', ...elevation.mid },
  photo: { width: '100%', aspectRatio: 1 },
  placeholder: { backgroundColor: colors.mint100 },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  dishes: { gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
