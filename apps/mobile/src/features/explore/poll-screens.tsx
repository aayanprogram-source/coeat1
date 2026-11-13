import type { ExplorePage } from '@datapal/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { env } from '@/lib/env';
import { useT } from '@/lib/config';
import { call, useRpc, useRpcMutation } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { ErrorState } from '@/ui/error-state';
import { ProgressBar } from '@/ui/progress-bar';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';

export function NewPollScreen() {
  const t = useT();
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const list = useQuery({ queryKey: ['explore', 'poll-picker'], queryFn: () => call<ExplorePage>('explore_restaurants', {}) });
  const create = useRpcMutation('create_poll');
  const ready = question.trim().length >= 3 && picked.length >= 2 && picked.length <= 4;

  return (
    <Screen>
      <AppText variant="h1">{t('explore.polls')}</AppText>
      <TextField label={t('explore.poll_question_placeholder')} value={question} onChangeText={setQuestion} />
      <AppText variant="label">{t('explore.poll_pick')}</AppText>
      <View style={styles.chips}>
        {(list.data?.items ?? []).map((r) => (
          <Chip key={r.id} label={r.name} selected={picked.includes(r.id)} onPress={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : p.length < 4 ? [...p, r.id] : p))} />
        ))}
      </View>
      <Button label={t('explore.new_poll')} disabled={!ready} loading={create.isPending} onPress={() => create.mutate({ p_question: question, p_restaurant_ids: picked }, { onSuccess: (id) => router.replace(`/poll/${id}`) })} />
    </Screen>
  );
}

interface Results {
  id: string;
  question: string;
  closes_at: string;
  my_vote: string | null;
  options: { id: string; restaurant_id: string; name: string; votes: number }[];
}

export function PollScreen() {
  const t = useT();
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const poll = useRpc<Results>('poll_results', { p_poll_id: id });
  const vote = useRpcMutation('vote_poll', { invalidate: [['rpc', 'poll_results']] });
  const data = poll.data;
  const total = data?.options.reduce((sum, o) => sum + o.votes, 0) ?? 0;

  if (poll.isError) return <Screen><ErrorState onRetry={() => void poll.refetch()} /></Screen>;

  return (
    <Screen>
      {data ? (
        <>
          <AppText variant="h1">{data.question}</AppText>
          {data.options.map((o) => (
            <View key={o.id} style={styles.option}>
              <Button variant={data.my_vote === o.id ? 'primary' : 'secondary'} label={o.name} disabled={data.my_vote !== null} onPress={() => vote.mutate({ p_poll_id: id, p_option_id: o.id }, { onSuccess: () => void client.invalidateQueries({ queryKey: ['rpc', 'poll_results'] }) })} />
              <ProgressBar value={o.votes} max={Math.max(total, 1)} label={t('explore.poll_votes', { count: o.votes })} />
              <AppText variant="caption" muted numeric>
                {t('explore.poll_votes', { count: o.votes })}
              </AppText>
            </View>
          ))}
          <Button variant="secondary" label={t('explore.poll_share')} onPress={() => void Share.share({ message: `${data.question} https://${env.linkDomain}/p/${id}` })} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingBottom: 12 },
});
