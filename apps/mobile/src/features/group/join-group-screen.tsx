import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useT } from '@/lib/config';
import { call, useErrorText } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';

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
