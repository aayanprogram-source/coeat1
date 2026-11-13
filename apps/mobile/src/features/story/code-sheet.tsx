import { formatDateTimeIst, type FeedStory, type IssueCodeResult } from '@datapal/core';
import { errorKey } from '@datapal/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettings, useT } from '@/lib/config';
import { call, useErrorText } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { BottomSheet } from '@/ui/bottom-sheet';
import { Button } from '@/ui/button';
import { CodeCard } from '@/ui/code-card';
import { haptic } from '@/ui/haptics';
import { Skeleton } from '@/ui/skeleton';
import { NotifyButton } from './notify-button';

type State = { name: 'working' } | { name: 'issued'; result: Extract<IssueCodeResult, { ok: true }> } | { name: 'refused'; reason: string; offerId: string | undefined } | { name: 'waitlisted' } | { name: 'error'; message: string };

export interface CodeSheetProps {
  story: FeedStory;
  visible: boolean;
  onClose: () => void;
  refetchStory: () => Promise<unknown>;
}

/** Issues the personal code when the sheet opens, after refreshing the counter, and explains every refusal. */
export function CodeSheet({ story, visible, onClose, refetchStory }: CodeSheetProps) {
  const t = useT();
  const router = useRouter();
  const client = useQueryClient();
  const settings = useSettings();
  const errorText = useErrorText();
  const [state, setState] = useState<State>({ name: 'working' });
  const latest = useRef({ refetchStory, client, errorText });
  useEffect(() => {
    latest.current = { refetchStory, client, errorText };
  });

  useEffect(() => {
    if (!visible) return;
    const token = { cancelled: false };
    setState({ name: 'working' });
    void (async () => {
      try {
        await latest.current.refetchStory();
        const result = await call<IssueCodeResult>('issue_code', { p_story_id: story.id });
        if (token.cancelled) return;
        if (result.ok) {
          haptic.success();
          setState({ name: 'issued', result });
          void latest.current.client.invalidateQueries({ queryKey: ['rpc', 'my_wallet'] });
          void latest.current.client.invalidateQueries({ queryKey: ['feed'] });
        } else {
          setState({ name: 'refused', reason: result.reason, offerId: result.offer_id });
        }
      } catch (e) {
        if (!token.cancelled) setState({ name: 'error', message: latest.current.errorText(e) });
      }
    })();
    return () => {
      token.cancelled = true;
    };
    // The story id is the only input; issuing again on re-render would waste a request.
  }, [visible, story.id]);

  const notify = async (offerId: string) => {
    try {
      await call('join_waitlist', { p_offer_id: offerId });
      setState({ name: 'waitlisted' });
    } catch (e) {
      setState({ name: 'error', message: errorText(e) });
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={t('common.close')}>
      {state.name === 'working' ? <Skeleton height={220} /> : null}
      {state.name === 'issued' ? (
        <>
          <AppText variant="h2">{t('story.code_ready')}</AppText>
          <CodeCard
            restaurantName={story.restaurant.name}
            logoPath={story.restaurant.logo_path}
            discountPercent={story.offer?.discount_percent ?? 0}
            capPaise={story.offer?.discount_cap_paise ?? 0}
            minBillPaise={story.offer?.min_bill_paise ?? 0}
            code={state.result.code.short_code}
            qrValue={state.result.code.id}
            expiresAt={state.result.code.expires_at}
            remaining={settings.bool('show_live_counters', true) ? state.result.remaining : null}
            total={story.offer?.total_codes ?? 0}
          />
          <AppText variant="caption" muted>
            {t('story.code_saved')}
          </AppText>
          <Button label={t('story.open_wallet')} onPress={() => { onClose(); router.push('/wallet'); }} />
        </>
      ) : null}
      {state.name === 'refused' ? (
        <View style={styles.gap}>
          <AppText variant="h2">{state.reason === 'offer_sold_out' ? t('common.sold_out') : t('story.ineligible_title')}</AppText>
          <AppText muted>
            {state.reason === 'offer_not_dropped' && story.offer?.drop_at ? t('story.not_dropped', { time: formatDateTimeIst(story.offer.drop_at) }) : t(errorKey(state.reason))}
          </AppText>
          {state.reason === 'offer_sold_out' && state.offerId ? <NotifyButton offerId={state.offerId} onNotify={notify} label={t('story.notify_next_drop')} /> : null}
          {state.reason === 'code_already_held' ? <Button label={t('story.open_wallet')} onPress={() => { onClose(); router.push('/wallet'); }} /> : null}
          <Button variant="ghost" label={t('common.close')} onPress={onClose} />
        </View>
      ) : null}
      {state.name === 'waitlisted' ? (
        <View style={styles.gap}>
          <AppText variant="h2">{t('story.on_waitlist')}</AppText>
          <Button label={t('common.done')} onPress={onClose} />
        </View>
      ) : null}
      {state.name === 'error' ? (
        <View style={styles.gap}>
          <AppText color="#C62828" accessibilityRole="alert">
            {state.message}
          </AppText>
          <Button variant="ghost" label={t('common.close')} onPress={onClose} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 } });
