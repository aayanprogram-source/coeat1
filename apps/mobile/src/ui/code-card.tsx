import { formatCountdown, formatPaise } from '@datapal/core';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { colors, elevation, radius } from '@/lib/theme';
import { useCountdown } from '@/lib/use-countdown';
import { AppText } from './app-text';
import { ProgressBar } from './progress-bar';
import { publicUrl } from './storage-url';

export interface CodeCardProps {
  restaurantName: string;
  logoPath: string | null;
  discountPercent: number;
  capPaise: number;
  minBillPaise: number;
  /** The personal 4-digit code, or null for the offer strip shown before a code is issued. */
  code: string | null;
  qrValue: string | null;
  expiresAt: string | null;
  remaining: number | null;
  total: number;
}

/** The ticket-style card with notched sides, used in the feed, the viewer and the wallet. */
export function CodeCard({ restaurantName, logoPath, discountPercent, capPaise, minBillPaise, code, qrValue, expiresAt, remaining, total }: CodeCardProps) {
  const t = useT();
  const left = useCountdown(expiresAt);
  const logo = publicUrl('restaurant-media', logoPath);

  return (
    <View style={styles.card} accessible accessibilityLabel={`${restaurantName}. ${t('common.off', { percent: discountPercent })}. ${code ?? ''}`}>
      <View style={[styles.notch, { left: -12 }]} />
      <View style={[styles.notch, { right: -12 }]} />
      <View style={styles.header}>
        {logo ? <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" /> : <View style={[styles.logo, { backgroundColor: colors.mint100 }]} />}
        <View style={styles.flex}>
          <AppText variant="h2" numberOfLines={1}>
            {restaurantName}
          </AppText>
          <AppText variant="caption" muted numeric>
            {t('common.off', { percent: discountPercent })} · {t('common.upto', { amount: formatPaise(capPaise) })}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" muted numeric>
        {t('common.min_bill', { amount: formatPaise(minBillPaise) })}
      </AppText>
      {code ? (
        <>
          <View style={styles.divider} />
          <View style={styles.codeRow}>
            <AppText style={styles.code} numeric accessibilityLabel={code.split('').join(' ')}>
              {code}
            </AppText>
            {qrValue ? <QRCode value={qrValue} size={88} color={colors.green900} backgroundColor={colors.surface} /> : null}
          </View>
        </>
      ) : null}
      {remaining !== null ? (
        <View style={styles.counter}>
          <ProgressBar value={remaining} max={total} label={t('common.codes_left', { count: remaining })} />
          <AppText variant="caption" muted numeric>
            {t('common.codes_left', { count: remaining })}
          </AppText>
        </View>
      ) : null}
      <View style={styles.footer}>
        <AppText variant="caption" muted style={styles.flex}>
          {t('common.first_time_only')}
        </AppText>
        {expiresAt ? (
          <AppText variant="label" numeric>
            {formatCountdown(left)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: 18, gap: 8, overflow: 'visible', ...elevation.mid },
  notch: { position: 'absolute', top: '58%', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 40, height: 40, borderRadius: radius.image },
  flex: { flex: 1 },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line, marginVertical: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontFamily: 'Fraunces_600SemiBold', fontSize: 44, letterSpacing: 12, color: colors.green900 },
  counter: { gap: 4, marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
