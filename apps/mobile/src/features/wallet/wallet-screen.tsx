import { useRouter } from 'expo-router';
import { Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { colors, pageMargin } from '@/lib/theme';
import { useNow } from '@/lib/use-now';
import { AppText } from '@/ui/app-text';
import { Chip } from '@/ui/chip';
import { CodeCard } from '@/ui/code-card';
import { EmptyState } from '@/ui/empty-state';
import { ErrorState } from '@/ui/error-state';
import { OfflineBanner } from '@/ui/offline-banner';
import { Skeleton } from '@/ui/skeleton';
import { RewardsPanel } from './rewards-panel';
import { groupOf, type CodeGroup, type Wallet } from './types';

export function WalletScreen() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<'codes' | 'rewards'>('codes');
  const [group, setGroup] = useState<CodeGroup>('active');
  const wallet = useRpc<Wallet>('my_wallet', {});
  const now = useNow(30_000);
  const codes = (wallet.data?.codes ?? []).filter((c) => groupOf(c, now) === group);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OfflineBanner />
      <View style={styles.head}>
        <AppText variant="h1">{t('wallet.title')}</AppText>
        <View style={styles.row}>
          <Chip label={t('wallet.codes')} selected={tab === 'codes'} onPress={() => setTab('codes')} />
          <Chip label={t('wallet.rewards')} selected={tab === 'rewards'} onPress={() => setTab('rewards')} />
        </View>
        {tab === 'codes' ? (
          <View style={styles.row}>
            {(['active', 'used', 'expired'] as const).map((g) => (
              <Chip key={g} label={t(`wallet.${g}`)} selected={group === g} onPress={() => setGroup(g)} />
            ))}
          </View>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={wallet.isRefetching} onRefresh={() => void wallet.refetch()} tintColor={colors.green700} />}>
        {wallet.isError && !wallet.data ? <ErrorState onRetry={() => void wallet.refetch()} /> : null}
        {wallet.isLoading ? <Skeleton height={220} /> : null}
        {wallet.data && tab === 'codes' && codes.length === 0 ? <EmptyState icon={Ticket} title={t('wallet.empty_codes_title')} body={t('wallet.empty_codes_body')} /> : null}
        {tab === 'codes'
          ? codes.map((c) => (
              <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.restaurant.name} ${c.short_code}`} onPress={() => router.push(`/code/${c.id}`)} disabled={group !== 'active'}>
                <CodeCard restaurantName={c.restaurant.name} logoPath={c.restaurant.logo_path} discountPercent={c.offer.discount_percent} capPaise={c.offer.discount_cap_paise} minBillPaise={c.offer.min_bill_paise} code={group === 'active' ? c.short_code : null} qrValue={group === 'active' ? c.id : null} expiresAt={group === 'active' ? c.expires_at : null} remaining={null} total={c.offer.total_codes} />
              </Pressable>
            ))
          : null}
        {tab === 'rewards' && wallet.data ? <RewardsPanel wallet={wallet.data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  head: { paddingHorizontal: pageMargin, paddingTop: 10, paddingBottom: 6, gap: 14 },
  row: { flexDirection: 'row', gap: 8 },
  list: { padding: pageMargin, gap: 18, paddingBottom: 40 },
});
