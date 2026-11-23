import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/config';
import { requestLocation } from '@/lib/location';
import { hashPhone } from '@/lib/phone-hash';
import { call } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Screen } from '@/ui/screen';
import { SuggestedFriends, type Suggestion } from './suggested-friends';

/** Both permissions are optional and explained in plain words first. Contacts are hashed on this phone. */
export function PermissionsScreen() {
  const t = useT();
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await refreshProfile();
    router.replace('/invite');
  };

  const allowContacts = async () => {
    setBusy(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== Contacts.PermissionStatus.GRANTED) return;
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const numbers = data.flatMap((c) => c.phoneNumbers?.map((p) => p.number ?? '') ?? []).filter(Boolean);
      const hashes = [...new Set(await Promise.all(numbers.map(hashPhone)))].slice(0, 5000);
      setSuggestions(await call<Suggestion[]>('sync_contacts', { p_hashes: hashes }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <Users size={28} color={colors.green900} />
        <AppText variant="h2">{t('onboarding.contacts_title')}</AppText>
        <AppText muted>{t('onboarding.contacts_body')}</AppText>
        {suggestions === null ? <Button label={t('onboarding.contacts_allow')} loading={busy} onPress={() => void allowContacts()} /> : <SuggestedFriends suggestions={suggestions} />}
      </Card>
      <Card style={styles.card}>
        <MapPin size={28} color={colors.green900} />
        <AppText variant="h2">{t('onboarding.location_title')}</AppText>
        <AppText muted>{t('onboarding.location_body')}</AppText>
        <Button variant="secondary" label={t('onboarding.location_allow')} onPress={() => void requestLocation()} />
      </Card>
      <View style={styles.footer}>
        <Button label={t('common.done')} onPress={() => void finish()} />
        <Button variant="ghost" label={t('onboarding.not_now')} onPress={() => void finish()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  footer: { gap: 8 },
});
