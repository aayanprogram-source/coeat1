import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Award, Settings, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { RatingStars } from '@/ui/rating-stars';
import { Screen } from '@/ui/screen';
import { Skeleton } from '@/ui/skeleton';
import { publicUrl } from '@/ui/storage-url';
import { Stat } from './stat';
interface Stats {
  stories: number;
  friends: number;
  friends_redeemed: number;
  badges: { id: string; name: string; icon: string }[];
}
interface DiaryEntry {
  id: string;
  photo_path: string;
  caption: string;
  created_at: string;
  restaurant: { id: string; name: string };
  dishes: { name: string; rating: number }[];
}

export function ProfileScreen() {
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const stats = useRpc<Stats>('my_profile_stats', {});
  const diary = useRpc<DiaryEntry[]>('food_diary', { p_limit: 20, p_offset: 0 });

  return (
    <Screen>
      <View style={styles.head}>
        {profile ? <Avatar person={{ id: profile.id, name: profile.name, avatar_path: profile.avatar_path }} size={64} /> : null}
        <View style={styles.flex}>
          <AppText variant="h1">{profile?.name}</AppText>
          <AppText muted>@{profile?.handle}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('profile.settings')} onPress={() => router.push('/settings')} style={styles.icon}>
          <Settings size={24} color={colors.ink} />
        </Pressable>
      </View>
      <Card style={styles.stats}>
        {stats.data ? (
          <>
            <Stat value={stats.data.stories} label={t('profile.stats_stories')} />
            <Stat value={stats.data.friends} label={t('profile.stats_friends')} />
            <Stat value={stats.data.friends_redeemed} label={t('profile.stats_redeemed')} />
          </>
        ) : (
          <Skeleton height={48} />
        )}
      </Card>
      <View style={styles.links}>
        <Chip label={t('profile.friends')} onPress={() => router.push('/friends')} />
        <Chip label={t('notifications.title')} onPress={() => router.push('/notifications')} />
      </View>
      <View style={styles.section}>
        <View style={styles.titleRow}>
          <Award size={20} color={colors.green700} />
          <AppText variant="h2">{t('profile.badges')}</AppText>
        </View>
        {stats.data?.badges.length === 0 ? <AppText muted>{t('profile.no_badges')}</AppText> : null}
        <View style={styles.badges}>
          {(stats.data?.badges ?? []).map((b) => (
            <Chip key={b.id} label={b.name} />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.titleRow}>
          <Users size={20} color={colors.green700} />
          <AppText variant="h2">{t('profile.diary')}</AppText>
        </View>
        {diary.data?.length === 0 ? <AppText muted>{t('profile.diary_empty')}</AppText> : null}
        {(diary.data ?? []).map((e) => {
          const photo = publicUrl('story-photos', e.photo_path);
          return (
            <Card key={e.id} style={styles.entry}>
              {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" /> : null}
              <View style={styles.flex}>
                <AppText variant="bodyMedium">{e.restaurant.name}</AppText>
                {e.dishes.slice(0, 3).map((d) => (
                  <View key={d.name} style={styles.dishRow}>
                    <AppText variant="caption" muted style={styles.flex}>
                      {d.name}
                    </AppText>
                    <RatingStars value={d.rating} size={12} label={d.name} />
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
  icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  links: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  section: { gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  entry: { flexDirection: 'row', gap: 12, padding: 12 },
  photo: { width: 72, height: 72, borderRadius: 12 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
