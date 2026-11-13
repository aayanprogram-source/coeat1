import { useRouter } from 'expo-router';
import { Utensils } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useT } from '@/lib/config';
import { useRpc } from '@/lib/rpc';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';

interface Visit {
  id: string;
  status: string;
  restaurant: string;
  table_label: string;
}

/** Shows an open table so a group can come back to its bill status and rate after it is verified. */
export function OpenTableBanner() {
  const t = useT();
  const router = useRouter();
  const visit = useRpc<Visit | null>('my_open_visit', {});
  if (!visit.data) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/group/${visit.data?.id}`)} style={styles.banner}>
      <Utensils size={20} color={colors.green900} />
      <AppText variant="label" color={colors.green900}>
        {t('group.open_banner', { restaurant: visit.data.restaurant })}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.mint100, borderRadius: radius.card, padding: 14, marginBottom: 16, minHeight: 44 },
});
