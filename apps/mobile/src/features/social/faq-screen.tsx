import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Screen } from '@/ui/screen';

export function FaqScreen() {
  const t = useT();
  const config = useAppConfig();
  const [open, setOpen] = useState<string | null>(null);
  const faqs = (config?.faqs ?? []).filter((f) => f.audience === 'customer');
  return (
    <Screen>
      <AppText variant="h1">{t('profile.faqs')}</AppText>
      {faqs.length === 0 ? <AppText muted>{t('profile.faqs_empty')}</AppText> : null}
      {faqs.map((f) => (
        <Pressable key={f.id} accessibilityRole="button" accessibilityState={{ expanded: open === f.id }} onPress={() => setOpen(open === f.id ? null : f.id)} style={styles.item}>
          <AppText variant="bodyMedium">{f.question}</AppText>
          {open === f.id ? <AppText muted style={styles.answer}>{f.answer}</AppText> : null}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, minHeight: 56, justifyContent: 'center' },
  answer: { marginTop: 8 },
});
