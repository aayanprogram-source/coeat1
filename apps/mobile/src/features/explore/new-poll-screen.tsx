import type { ExplorePage } from '@datapal/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { call, useRpcMutation } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
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


const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
