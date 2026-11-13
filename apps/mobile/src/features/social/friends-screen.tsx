import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { call, useRpc, useRpcMutation } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { Avatar, type Person } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';

interface Friend extends Person {
  handle: string | null;
}
interface Friends {
  friends: Friend[];
  requests: (Friend & { friendship_id: string })[];
}

function PersonRow({ person, children }: { person: Friend; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar person={person} />
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{person.name}</AppText>
        <AppText variant="caption" muted>
          @{person.handle}
        </AppText>
      </View>
      {children}
    </View>
  );
}

export function FriendsScreen() {
  const t = useT();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const friends = useRpc<Friends>('my_friends', {});
  const found = useQuery({ queryKey: ['user-search', search], enabled: search.trim().length >= 3, queryFn: () => call<Friend[]>('search_users', { p_query: search }) });
  const invalidate = { invalidate: [['rpc', 'my_friends']] };
  const respond = useRpcMutation('respond_friend_request', invalidate);
  const remove = useRpcMutation('remove_friend', invalidate);
  const add = useRpcMutation('send_friend_request', { invalidate: [['user-search']] });

  if (friends.isError) return <Screen><ErrorState onRetry={() => void friends.refetch()} /></Screen>;

  return (
    <Screen>
      <AppText variant="h1">{t('profile.friends')}</AppText>
      <TextField label={t('profile.find_friends')} autoCapitalize="none" value={search} onChangeText={setSearch} />
      {(found.data ?? []).map((p) => (
        <PersonRow key={p.id} person={p}>
          <Button variant="secondary" label={t('profile.add_friend')} onPress={() => add.mutate({ p_user_id: p.id }, { onSuccess: () => void client.invalidateQueries({ queryKey: ['user-search'] }) })} />
        </PersonRow>
      ))}
      {(friends.data?.requests.length ?? 0) > 0 ? <AppText variant="h2">{t('profile.friend_requests')}</AppText> : null}
      {(friends.data?.requests ?? []).map((r) => (
        <PersonRow key={r.friendship_id} person={r}>
          <Button label={t('profile.accept')} onPress={() => respond.mutate({ p_friendship_id: r.friendship_id, p_accept: true })} />
          <Button variant="ghost" label={t('profile.block')} onPress={() => remove.mutate({ p_user_id: r.id, p_block: true })} />
        </PersonRow>
      ))}
      <AppText variant="h2">{t('profile.friends')}</AppText>
      {friends.data?.friends.length === 0 ? <AppText muted>{t('feed.empty_body')}</AppText> : null}
      {(friends.data?.friends ?? []).map((f) => (
        <PersonRow key={f.id} person={f}>
          <Button variant="ghost" label={t('common.remove')} onPress={() => remove.mutate({ p_user_id: f.id })} />
        </PersonRow>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
