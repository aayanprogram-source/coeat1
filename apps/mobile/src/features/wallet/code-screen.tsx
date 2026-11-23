import * as Brightness from 'expo-brightness';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { formatCountdown } from '@datapal/core';
import { useCountdown } from '@/lib/use-countdown';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { Screen } from '@/ui/screen';
import type { Wallet } from './types';

/** The counter view: a high-contrast QR and the 4 digits, with the screen brightness raised while it is open. */
export function CodeScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const wallet = useRpc<Wallet>('my_wallet', {});
  const code = wallet.data?.codes.find((c) => c.id === id);
  const left = useCountdown(code?.expires_at ?? null);

  useEffect(() => {
    let previous: number | null = null;
    void Brightness.getBrightnessAsync()
      .then(async (value) => {
        previous = value;
        await Brightness.setBrightnessAsync(1);
      })
      .catch(() => undefined);
    return () => {
      if (previous !== null) void Brightness.setBrightnessAsync(previous).catch(() => undefined);
    };
  }, []);

  if (wallet.isError) return <ErrorState onRetry={() => void wallet.refetch()} />;
  if (!code) return null;

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <AppText variant="h1">{code.restaurant.name}</AppText>
        <AppText muted>{t('wallet.show_at_counter')}</AppText>
        <View style={styles.qr}>
          <QRCode value={code.id} size={240} color="#000000" backgroundColor="#FFFFFF" />
        </View>
        <AppText accessibilityLabel={code.short_code.split('').join(' ')} style={styles.code} numeric>
          {code.short_code}
        </AppText>
        <AppText variant="label" numeric>
          {formatCountdown(left)}
        </AppText>
        <AppText variant="caption" muted>
          {t('common.first_time_only')}
        </AppText>
      </View>
      <Button variant="secondary" label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  qr: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line },
  code: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 64, letterSpacing: 16, color: '#000000' },
});
