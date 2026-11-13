import type { OfferCard } from '@datapal/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/config';
import { call } from '@/lib/rpc';
import { flushStories, queueStory } from '@/lib/story-queue';
import { useToast } from '@/lib/toast';
import { useNow } from '@/lib/use-now';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { haptic } from '@/ui/haptics';
import { Screen } from '@/ui/screen';
import { CheckinStep } from './checkin-step';
import { ComposeStep } from './compose-step';
import { DishesStep } from './dishes-step';
import { clearDraft, emptyDraft, isCheckinLive, loadDraft, saveDraft, type StoryDraft } from './draft';

export function CreateScreen() {
  const t = useT();
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const { session } = useAuth();
  const [draft, setDraft] = useState<StoryDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [offer, setOffer] = useState<OfferCard | null>(null);
  const [posting, setPosting] = useState(false);
  const now = useNow(30_000);
  const checkedIn = isCheckinLive(draft, now);
  const [forcedStep, setForcedStep] = useState<number | null>(null);
  const shown = !checkedIn || !draft.restaurant ? 0 : (forcedStep ?? (Object.keys(draft.ratings).length === 0 ? 1 : 2));

  useEffect(() => {
    void loadDraft().then((saved) => {
      if (saved) {
        setDraft(saved);
        setRestored(true);
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (restored) toast.show(t('post.draft_restored'));
  }, [restored, toast, t]);

  useEffect(() => {
    if (ready) void saveDraft(draft);
  }, [draft, ready]);

  useEffect(() => {
    if (!draft.restaurant || !checkedIn) return;
    void call<{ offer: OfferCard | null }>('restaurant_page', { p_restaurant_id: draft.restaurant.id }).then((p) => setOffer(p.offer)).catch(() => setOffer(null));
  }, [draft.restaurant, checkedIn]);

  const patch = (next: Partial<StoryDraft>) => setDraft((d) => ({ ...d, ...next }));

  const post = async () => {
    if (!draft.checkinId || !draft.photoUri || !session) return;
    setPosting(true);
    await queueStory({
      userId: session.user.id,
      checkinId: draft.checkinId,
      photoUri: draft.photoUri,
      caption: draft.caption,
      dishes: Object.entries(draft.ratings).map(([menu_item_id, rating]) => ({ menu_item_id, rating })),
    });
    await clearDraft();
    const result = await flushStories().catch(() => null);
    setPosting(false);
    haptic.success();
    toast.show(result && result.posted.length > 0 ? t('post.posted') : t('post.queued'));
    void client.invalidateQueries({ queryKey: ['feed'] });
    router.back();
  };

  if (!ready) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="label" muted>
          {t('post.title')} · {shown + 1}/3
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => router.back()} style={styles.close}>
          <X size={24} color={colors.ink} />
        </Pressable>
      </View>
      {shown === 0 ? <CheckinStep onCheckedIn={(p) => { patch(p); setForcedStep(null); }} /> : null}
      {shown === 1 && draft.restaurant ? <DishesStep restaurantId={draft.restaurant.id} ratings={draft.ratings} onRatings={(ratings) => patch({ ratings })} onNext={() => setForcedStep(2)} /> : null}
      {shown === 2 && draft.restaurant ? (
        <ComposeStep restaurantName={draft.restaurant.name} logoPath={draft.restaurant.logo_path} offer={offer} photoUri={draft.photoUri} caption={draft.caption} onPhoto={(photoUri) => patch({ photoUri })} onCaption={(caption) => patch({ caption })} onPost={() => void post()} posting={posting} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
