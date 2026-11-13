import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { useRpcMutation } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';

export interface Suggestion {
  id: string;
  name: string | null;
  handle: string | null;
  avatar_path: string | null;
}

export function SuggestedFriends({ suggestions }: { suggestions: Suggestion[] }) {
  const t = useT();
  const [sent, setSent] = useState<string[]>([]);
  const request = useRpcMutation('send_friend_request');

  if (suggestions.length === 0) return <AppText muted>{t('onboarding.no_matches')}</AppText>;
  return (
    <View style={styles.list}>
      {suggestions.map((s) => (
        <View key={s.id} style={styles.row}>
          <Avatar person={s} />
          <View style={styles.flex}>
            <AppText variant="label">{s.name}</AppText>
            <AppText variant="caption" muted>
              @{s.handle}
            </AppText>
          </View>
          <Button variant="secondary" label={sent.includes(s.id) ? t('profile.requested') : t('profile.add_friend')} disabled={sent.includes(s.id)} onPress={() => request.mutate({ p_user_id: s.id }, { onSuccess: () => setSent((list) => [...list, s.id]) })} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
