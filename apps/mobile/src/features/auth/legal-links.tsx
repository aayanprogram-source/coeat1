import type { PendingLegal } from '@datapal/core';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';

/** Each document opens in full before it is accepted. */
export function LegalLinks({ documents }: { documents: PendingLegal[] }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {documents.map((d) => (
        <Pressable key={d.kind} accessibilityRole="link" onPress={() => router.push(`/legal/${d.kind}`)} style={styles.link}>
          <AppText variant="label" color={colors.green700} style={styles.underline}>
            {d.title}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
