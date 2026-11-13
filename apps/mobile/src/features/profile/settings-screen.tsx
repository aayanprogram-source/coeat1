import { settingNumber, settingString } from '@datapal/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Switch, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useAppConfig, useLocale, useT } from '@/lib/config';
import { useRpcMutation } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { BottomSheet } from '@/ui/bottom-sheet';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { Screen } from '@/ui/screen';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.green700, false: colors.line }} />
    </View>
  );
}

export function SettingsScreen() {
  const t = useT();
  const router = useRouter();
  const config = useAppConfig();
  const { profile, refreshProfile, signOut } = useAuth();
  const { locale, setLocale, available } = useLocale();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifications, setNotifications] = useState(profile?.notifications_enabled ?? true);
  const give = useRpcMutation('give_consent');
  const withdraw = useRpcMutation('withdraw_consent');
  const exportData = useRpcMutation('request_data_export');
  const remove = useRpcMutation('delete_account');
  const limit = config ? settingNumber(config, 'alert_limit_per_week') : 0;
  const officerName = config ? settingString(config, 'grievance_officer_name') : '';
  const officerContact = config ? settingString(config, 'grievance_officer_contact') : '';

  const toggleNotifications = (next: boolean) => {
    setNotifications(next);
    (next ? give : withdraw).mutate({ p_kind: 'notifications' }, { onSuccess: () => void refreshProfile() });
  };

  return (
    <Screen>
      <AppText variant="h1">{t('profile.settings')}</AppText>
      <Card style={styles.card}>
        <AppText variant="h2">{t('profile.notifications')}</AppText>
        <Toggle label={t('profile.notifications')} value={notifications} onChange={toggleNotifications} />
        <AppText variant="caption" muted>
          {t('profile.notifications_help', { limit })}
        </AppText>
      </Card>
      <Card style={styles.card}>
        <AppText variant="h2">{t('profile.privacy')}</AppText>
        <Toggle label={t('profile.marketing')} value={false} onChange={(next) => (next ? give : withdraw).mutate({ p_kind: 'marketing' })} />
        <Button variant="secondary" label={t('profile.export')} loading={exportData.isPending} onPress={() => exportData.mutate({}, { onSuccess: (data) => void Share.share({ message: JSON.stringify(data, null, 2) }) })} />
        <Button variant="secondary" label={t('profile.withdraw_consent')} onPress={() => withdraw.mutate({ p_kind: 'marketing' })} />
      </Card>
      {available.length > 1 ? (
        <Card style={styles.card}>
          <AppText variant="h2">{t('profile.language')}</AppText>
          <View style={styles.chips}>
            {available.map((l) => (
              <Chip key={l} label={l} selected={locale === l} onPress={() => setLocale(l)} />
            ))}
          </View>
        </Card>
      ) : null}
      <Card style={styles.card}>
        <AppText variant="h2">{t('profile.grievance')}</AppText>
        <AppText>{officerName}</AppText>
        <AppText muted>{officerContact}</AppText>
      </Card>
      <View style={styles.links}>
        <Button variant="secondary" label={t('profile.faqs')} onPress={() => router.push('/faq')} />
        {(config?.legal ?? []).map((d) => (
          <Button key={d.kind} variant="ghost" label={d.title} onPress={() => router.push(`/legal/${d.kind}`)} />
        ))}
      </View>
      <Button variant="secondary" label={t('common.sign_out')} onPress={() => void signOut()} />
      <Button variant="destructive" label={t('profile.delete_account')} onPress={() => setConfirmDelete(true)} />
      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} closeLabel={t('common.close')}>
        <AppText variant="h2">{t('profile.delete_confirm_title')}</AppText>
        <AppText muted>{t('profile.delete_confirm_body')}</AppText>
        <Button variant="destructive" label={t('profile.delete_account')} loading={remove.isPending} onPress={() => remove.mutate({}, { onSuccess: () => void signOut() })} />
        <Button variant="ghost" label={t('common.cancel')} onPress={() => setConfirmDelete(false)} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  links: { gap: 8 },
});
