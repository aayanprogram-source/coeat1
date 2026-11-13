import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useT } from '@/lib/config';
import { call, useErrorText } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
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
