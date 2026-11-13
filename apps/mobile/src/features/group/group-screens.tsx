import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Share, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { env } from '@/lib/env';
import { call, useErrorText, useRpc } from '@/lib/rpc';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { ErrorState } from '@/ui/error-state';
import { Screen } from '@/ui/screen';
import { TextField } from '@/ui/text-field';
import { CheckinStep } from '../create/checkin-step';

export function StartGroupScreen() {
  const t = useT();
  const router = useRouter();
  const errorText = useErrorText();
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const start = async (restaurantId: string) => {
    try {
      const visit = await call<{ id: string }>('start_group_visit', { p_restaurant_id: restaurantId, p_table_label: label });
      router.replace(`/group/${visit.id}`);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Screen>
      <AppText variant="h1">{t('group.start')}</AppText>
      <TextField label={t('group.table_label')} value={label} onChangeText={setLabel} maxLength={30} />
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      <CheckinStep onCheckedIn={(p) => p.restaurant && void start(p.restaurant.id)} />
    </Screen>
  );
}

interface Visit {
  id: string;
  status: string;
  table_label: string;
  restaurant_id: string;
  join_token: string | null;
  members: { id: string; name: string | null; handle: string | null; avatar_path: string | null }[];
}

export function GroupScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visit = useRpc<Visit>('get_visit', { p_visit_id: id });
  const data = visit.data;

  useEffect(() => {
    if (data?.status === 'verified') return;
    const timer = setInterval(() => void visit.refetch(), 5000);
    return () => clearInterval(timer);
  }, [data?.status, visit]);

  if (visit.isError) return <Screen><ErrorState onRetry={() => void visit.refetch()} /></Screen>;
  const link = data?.join_token ? `https://${env.linkDomain}/t/${data.join_token}` : null;

  return (
    <Screen>
      <AppText variant="h1">{t('group.title')}</AppText>
      {data ? (
        <>
          <Card style={styles.card}>
            <AppText variant="label">{data.table_label ? `${t('group.table_label')} ${data.table_label}` : t('group.title')}</AppText>
            <AppText color={data.status === 'verified' ? colors.success : colors.muted}>{data.status === 'verified' ? t('group.bill_verified') : t('group.bill_open')}</AppText>
          </Card>
          {link ? (
            <View style={styles.qr}>
              <QRCode value={link} size={200} />
              <AppText variant="caption" muted>
                {t('group.join_by_qr')}
              </AppText>
              <Button variant="secondary" label={t('common.share')} onPress={() => void Share.share({ message: link })} />
            </View>
          ) : null}
          <AppText variant="h2">{t('group.members')}</AppText>
          {data.members.map((m) => (
            <View key={m.id} style={styles.member}>
              <Avatar person={m} />
              <AppText>{m.name}</AppText>
            </View>
          ))}
          {data.status === 'verified' ? <Button label={t('group.rate_prompt')} onPress={() => router.push('/create')} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

export function JoinGroupScreen() {
  const t = useT();
  const router = useRouter();
  const errorText = useErrorText();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      const visitId = await call<string>('join_group_visit', { p_join_token: token });
      router.replace(`/group/${visitId}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppText variant="h1">{t('group.join')}</AppText>
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      <Button label={t('group.join')} loading={busy} onPress={() => void join()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  qr: { alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface, borderRadius: radius.card },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
