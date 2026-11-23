import { useRouter } from 'expo-router';
import { Gift, Share2, Ticket, Users } from 'lucide-react-native';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/config';
import { env } from '@/lib/env';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Avatar } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';

/** The last onboarding step: a warm nudge to bring friends, with the three reasons it pays off. */
export function InviteScreen() {
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const perks = [
    { icon: Users, text: t('invite.perk_1') },
    { icon: Ticket, text: t('invite.perk_2') },
    { icon: Gift, text: t('invite.perk_3') },
  ];
  const done = () => router.replace('/');
  const invite = async () => {
    await Share.share({ message: t('feed.invite_message', { name: profile?.name ?? '', link: `https://${env.linkDomain}` }) });
    done();
  };

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
        <View style={styles.faces}>
          {profile ? <Avatar person={{ id: profile.id, name: profile.name, avatar_path: profile.avatar_path }} size={84} /> : null}
          <View style={[styles.ghost, { left: -34, backgroundColor: '#FCEBC2' }]}>
            <AppText style={styles.ghostEmoji}>🦁</AppText>
          </View>
          <View style={[styles.ghost, { right: -34, backgroundColor: '#DDEFE6' }]}>
            <AppText style={styles.ghostEmoji}>🐸</AppText>
          </View>
        </View>
        <AppText variant="h1" style={styles.center}>
          {t('invite.title')}
        </AppText>
        <AppText muted style={styles.center}>
          {t('invite.body')}
        </AppText>
      </Animated.View>
      <View style={styles.perks}>
        {perks.map((p, i) => (
          <Animated.View key={p.text} entering={FadeInDown.duration(400).delay(250 + i * 120)} style={styles.perk}>
            <View style={styles.perkIcon}>
              <p.icon size={20} color={colors.green900} strokeWidth={2.2} />
            </View>
            <AppText variant="bodyMedium" style={styles.flex}>
              {p.text}
            </AppText>
          </Animated.View>
        ))}
      </View>
      <View style={styles.footer}>
        <Button label={t('invite.share')} icon={<Share2 size={18} color="#FFFFFF" />} onPress={() => void invite()} />
        <Button variant="ghost" label={t('invite.skip')} onPress={done} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingTop: 24 },
  faces: { marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  ghost: { position: 'absolute', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background },
  ghostEmoji: { fontSize: 28, lineHeight: 36 },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  perks: { gap: 10 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 },
  perkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 6, marginTop: 8 },
});
