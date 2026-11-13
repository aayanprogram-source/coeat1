import { Gift } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { useRpcMutation } from '@/lib/rpc';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { haptic } from '@/ui/haptics';
import { ProgressBar } from '@/ui/progress-bar';
import type { Wallet } from './types';

/** Progress toward each restaurant's next reward level, and unlocked rewards. Rewards work only at their restaurant. */
export function RewardsPanel({ wallet }: { wallet: Wallet }) {
  const t = useT();
  const [shown, setShown] = useState<string | null>(null);
  const claim = useRpcMutation('claim_reward', { invalidate: [['rpc', 'my_wallet']] });

  if (wallet.rewards.length === 0 && wallet.progress.length === 0) {
    return <EmptyState icon={Gift} title={t('wallet.empty_rewards_title')} body={t('wallet.empty_rewards_body')} />;
  }

  return (
    <View style={styles.gap}>
      {wallet.progress.map((p) => {
        const next = p.levels.find((l) => l.friends_required > p.released) ?? p.levels[p.levels.length - 1];
        return (
          <Card key={p.restaurant_id} style={styles.card}>
            <AppText variant="h2">{p.name}</AppText>
            {next ? (
              <>
                <ProgressBar value={Math.min(p.released, next.friends_required)} max={next.friends_required} label={t('wallet.progress', { released: p.released, required: next.friends_required })} />
                <AppText variant="caption" muted numeric>
                  {t('wallet.progress', { released: p.released, required: next.friends_required })} · {next.label}
                </AppText>
              </>
            ) : null}
            {p.held > 0 ? (
              <AppText variant="caption" muted numeric>
                {t('wallet.held_credits', { count: p.held })}
              </AppText>
            ) : null}
          </Card>
        );
      })}
      {wallet.rewards.map((r) => (
        <Card key={r.id} style={styles.card}>
          <AppText variant="h2">{r.label}</AppText>
          <AppText variant="caption" muted>
            {t('wallet.reward_only_here', { restaurant: r.restaurant.name })}
          </AppText>
          {r.status === 'available' ? (
            shown === r.id ? (
              <View style={styles.show} accessibilityRole="alert">
                <AppText variant="label" color={colors.surface}>
                  {t('wallet.show_staff')}
                </AppText>
              </View>
            ) : (
              <Button label={t('wallet.use_reward')} loading={claim.isPending} onPress={() => claim.mutate({ p_reward_id: r.id }, { onSuccess: () => { haptic.success(); setShown(r.id); } })} />
            )
          ) : (
            <AppText variant="label" muted>
              {r.status === 'used' ? t('wallet.reward_used') : t('wallet.reward_locked')}
            </AppText>
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  card: { gap: 10 },
  show: { backgroundColor: colors.green900, borderRadius: 12, padding: 14 },
});
