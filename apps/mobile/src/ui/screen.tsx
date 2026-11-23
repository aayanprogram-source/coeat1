import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, pageMargin } from '@/lib/theme';
import { OfflineBanner } from './offline-banner';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Page frame: safe areas, 16 point margins, offline banner and keyboard handling. */
export function Screen({ children, scroll = true, padded = true, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const content = padded ? { paddingHorizontal: pageMargin, paddingTop: 12, paddingBottom: 40, gap: 18 } : undefined;
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView style={styles.flex} contentContainerStyle={content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(360)} style={{ gap: 18 }}>
              {children}
            </Animated.View>
          </ScrollView>
        ) : (
          <View style={[styles.flex, content]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
});
