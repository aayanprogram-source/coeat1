import { useRouter } from 'expo-router';
import { Vote } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';

interface Poll {
  id: string;
  question: string;
  closes_at: string;
  author: string;
}

export function PollsSection() {
  const t = useT();
  const router = useRouter();
  const polls = useRpc<Poll[]>('recent_polls', {});
  return (
    <View style={styles.gap}>
      <View style={styles.row}>
        <AppText variant="h2" style={styles.flex}>
          {t('explore.polls')}
        </AppText>
        <Button variant="secondary" label={t('explore.new_poll')} onPress={() => router.push('/poll/new')} />
      </View>
      {(polls.data ?? []).map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push(`/poll/${p.id}`)} style={styles.card}>
          <Vote size={20} color={colors.green700} />
          <View style={styles.flex}>
            <AppText variant="bodyMedium">{p.question}</AppText>
            <AppText variant="caption" muted>
              {p.author}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.mint100, borderRadius: radius.card, padding: 14, minHeight: 56 },
});
