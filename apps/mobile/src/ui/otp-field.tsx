import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { AppText } from './app-text';

export function OtpField({ value, onChange, length = 6, label }: { value: string; onChange: (next: string) => void; length?: number; label: string }) {
  const input = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel={label} accessibilityRole="none">
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.box, value.length === i ? styles.active : null]}>
            <AppText variant="h1" numeric>
              {value[i] ?? ''}
            </AppText>
          </View>
        ))}
      </View>
      <TextInput
        ref={input}
        autoFocus
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        accessibilityLabel={label}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, minHeight: 56, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  active: { borderColor: colors.green700, borderWidth: 2 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
