import 'react-native-gesture-handler';
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { ConfigProvider } from '@/lib/config';
import { ToastProvider } from '@/lib/toast';
import { colors } from '@/lib/theme';
import { AppGate } from '@/features/app/app-gate';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 2, retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000) } } }));
  const [loaded] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <ConfigProvider>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <AppGate>
                  <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 220, contentStyle: { backgroundColor: colors.background } }}>
                    <Stack.Screen name="story/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                    <Stack.Screen name="create" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="code/[id]" options={{ presentation: 'modal' }} />
                  </Stack>
                </AppGate>
              </ToastProvider>
            </AuthProvider>
          </ConfigProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
