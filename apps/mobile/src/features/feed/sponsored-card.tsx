import type { SponsoredCard as Card } from '@datapal/core';
import { formatPaise } from '@datapal/core';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { call } from '@/lib/rpc';
import { colors, elevation, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Chip } from '@/ui/chip';
import { publicUrl } from '@/ui/storage-url';

/** A restaurant's paid placement. It is labelled, looks like a restaurant offer card, and never like a friend's story. */
export function SponsoredCard({ card }: { card: Card }) {
  const t = useT();
  const router = useRouter();
  const cover = publicUrl('restaurant-media', card.restaurant.cover_path ?? card.restaurant.logo_path);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.label}. ${card.restaurant.name}`}
      onPress={() => {
        void call('record_placement_event', { p_placement_id: card.placement_id, p_kind: 'tap' }).catch(() => undefined);
        router.push(`/restaurant/${card.restaurant.id}`);
      }}
      style={styles.card}
    >
      {cover ? <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" /> : <View style={[styles.cover, { backgroundColor: colors.mint100 }]} />}
      <View style={styles.body}>
        <Chip label={card.label} />
        <AppText variant="h2">{card.restaurant.name}</AppText>
        <AppText muted numeric>
          {t('common.off', { percent: card.offer.discount_percent })} · {t('common.upto', { amount: formatPaise(card.offer.discount_cap_paise) })} · {t('common.min_bill', { amount: formatPaise(card.offer.min_bill_paise) })}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.saffron500, ...elevation.low },
  cover: { width: '100%', height: 140 },
  body: { padding: 16, gap: 6, alignItems: 'flex-start' },
});
