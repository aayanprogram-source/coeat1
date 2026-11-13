import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from './app-text';
import { Button } from './button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Icon size={28} color={colors.green900} />
      </View>
      <AppText variant="h2" style={styles.center}>
        {title}
      </AppText>
      <AppText muted style={styles.center}>
        {body}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, padding: 32 },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
