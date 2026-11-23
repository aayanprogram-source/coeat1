import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, type as typography } from '@/lib/theme';
import { AppText } from './app-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, focused ? styles.focused : null, error ? styles.invalid : null, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
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
  input: { ...typography.body, minHeight: 54, borderRadius: radius.input, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, color: colors.ink },
  focused: { borderColor: colors.green900 },
  invalid: { borderColor: colors.danger },
});
