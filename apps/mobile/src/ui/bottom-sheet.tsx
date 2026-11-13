import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, elevation, radius } from '@/lib/theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}

/** A sheet with a 24 point top radius that springs in. Tapping outside or the handle closes it. */
export function BottomSheet({ visible, onClose, closeLabel, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={closeLabel} accessibilityRole="button" />
      <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={styles.sheet}>
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, paddingBottom: 32, gap: 16, ...elevation.mid },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
});
