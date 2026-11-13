interface Results {
  id: string;
  question: string;
  closes_at: string;
  my_vote: string | null;
  options: { id: string; restaurant_id: string; name: string; votes: number }[];
}

import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { env } from '@/lib/env';
import { colors } from '@/lib/theme';
import { useT } from '@/lib/config';
import { useRpc, useRpcMutation } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { ProgressBar } from '@/ui/progress-bar';
import { Screen } from '@/ui/screen';

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
  option: { gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingBottom: 12 },
});
