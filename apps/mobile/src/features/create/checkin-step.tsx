import type { ExplorePage } from '@datapal/core';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { currentPosition, requestLocation, type Position } from '@/lib/location';
import { call, useErrorText } from '@/lib/rpc';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { Skeleton } from '@/ui/skeleton';
import { TextField } from '@/ui/text-field';
import type { StoryDraft } from './draft';

export interface CheckinStepProps {
  onCheckedIn: (patch: Pick<StoryDraft, 'restaurant' | 'checkinId' | 'checkinExpiresAt'>) => void;
}

/** GPS check-in at a nearby restaurant, with search. The database verifies the distance. */
export function CheckinStep({ onCheckedIn }: CheckinStepProps) {
  const t = useT();
  const errorText = useErrorText();
  const [position, setPosition] = useState<Position | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<ExplorePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void currentPosition().then(setPosition);
  }, []);

  useEffect(() => {
    if (position === undefined) return;
    const id = setTimeout(() => {
      void call<ExplorePage>('explore_restaurants', { p_query: query, p_lat: (position?.lat ?? undefined) as never, p_lng: (position?.lng ?? undefined) as never }).then(setPage).catch((e: unknown) => setError(errorText(e)));
    }, 250);
    return () => clearTimeout(id);
  }, [position, query, errorText]);

  const checkIn = async (r: { id: string; name: string; logo_path: string | null }) => {
    if (!position) {
      setError(t('post.checkin_location_needed'));
      return;
    }
    setBusy(r.id);
    setError(null);
    try {
      const result = await call<{ id: string; expires_at: string }>('check_in', { p_restaurant_id: r.id, p_lat: position.lat, p_lng: position.lng });
      onCheckedIn({ restaurant: { id: r.id, name: r.name, logo_path: r.logo_path }, checkinId: result.id, checkinExpiresAt: result.expires_at });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.gap}>
      <AppText variant="h1">{t('post.checkin_title')}</AppText>
      <AppText muted>{t('post.checkin_body')}</AppText>
      {position === null ? (
        <View style={styles.gap}>
          <AppText color={colors.danger}>{t('post.checkin_location_needed')}</AppText>
          <Button variant="secondary" label={t('onboarding.location_allow')} onPress={() => void requestLocation().then(() => currentPosition().then(setPosition))} />
        </View>
      ) : null}
      <TextField label={t('post.checkin_search')} value={query} onChangeText={setQuery} />
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      {page === null ? <Skeleton height={120} /> : null}
      {page?.items.length === 0 ? <EmptyState icon={MapPin} title={t('explore.empty_title')} body={t('explore.empty_body')} /> : null}
      {page?.items.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${t('post.checkin_cta')} ${r.name}`} onPress={() => void checkIn(r)} style={[styles.row, busy === r.id ? styles.busy : null]}>
          <MapPin size={20} color={colors.green700} />
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{r.name}</AppText>
            <AppText variant="caption" muted numeric>
              {r.address}
              {r.distance_m !== null ? ` · ${r.distance_m} m` : ''}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 12 },
  busy: { opacity: 0.5 },
});
