import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, type as typography } from '@/lib/theme';
import { AppText } from './app-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, style, ...rest }, ref) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.invalid : null, style]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { ...typography.body, minHeight: 48, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.ink },
  invalid: { borderColor: colors.danger },
});
