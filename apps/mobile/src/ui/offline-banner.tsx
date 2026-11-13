import { useT } from '@/lib/config';
import { useOnline } from '@/lib/network';
import { WifiOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';
import { AppText } from './app-text';

export function OfflineBanner() {
  const t = useT();
  if (useOnline()) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <WifiOff size={16} color={colors.surface} />
      <AppText variant="caption" color={colors.surface}>
        {t('common.offline')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 8 },
});
