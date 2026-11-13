import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { colors, elevation, radius, type as typography } from './theme';

interface ToastApi {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null);
  const next = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((text: string) => {
    const id = next.current++;
    setMessage({ id, text });
    AccessibilityInfo.announceForAccessibility(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage((m) => (m?.id === id ? null : m)), 4000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {message ? (
        <Animated.View key={message.id} entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(150)} style={styles.wrap} pointerEvents="none">
          <View style={styles.toast} accessibilityRole="alert">
            <Text style={styles.text}>{message.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider is missing');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center' },
  toast: { backgroundColor: colors.ink, borderRadius: radius.button, paddingHorizontal: 16, paddingVertical: 12, ...elevation.mid },
  text: { ...typography.body, color: colors.surface, textAlign: 'center' },
});
