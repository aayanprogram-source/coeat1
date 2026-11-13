import { Tabs, useRouter } from 'expo-router';
import { Compass, Home, Plus, User, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { colors, elevation, fonts } from '@/lib/theme';
import { haptic } from '@/ui/haptics';

function PostButton() {
  const t = useT();
  const router = useRouter();
  return (
    <View style={styles.postWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.post')}
        onPress={() => {
          haptic.tap();
          router.push('/create');
        }}
        style={styles.post}
      >
        <Plus size={28} color={colors.green900} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green900,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, minHeight: 64 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.explore'), tabBarIcon: ({ color }) => <Compass size={22} color={color} /> }} />
      <Tabs.Screen name="post" options={{ title: t('tabs.post'), tabBarButton: () => <PostButton /> }} />
      <Tabs.Screen name="wallet" options={{ title: t('tabs.wallet'), tabBarIcon: ({ color }) => <Wallet size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  postWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  post: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.saffron500, alignItems: 'center', justifyContent: 'center', marginTop: -20, ...elevation.mid },
});
