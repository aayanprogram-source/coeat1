import type { OfferCard } from '@datapal/core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSettings, useT } from '@/lib/config';
import { preparePhoto } from '@/lib/story-queue';
import { colors, radius } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { CodeCard } from '@/ui/code-card';
import { TextField } from '@/ui/text-field';

export interface ComposeStepProps {
  restaurantName: string;
  logoPath: string | null;
  offer: OfferCard | null;
  photoUri: string | null;
  caption: string;
  onPhoto: (uri: string) => void;
  onCaption: (text: string) => void;
  onPost: () => void;
  posting: boolean;
}

/** Photo (camera or gallery, compressed before it is stored), caption, and a preview with the code card. */
export function ComposeStep({ restaurantName, logoPath, offer, photoUri, caption, onPhoto, onCaption, onPost, posting }: ComposeStepProps) {
  const t = useT();
  const settings = useSettings();

  const pick = async (source: 'camera' | 'library') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync({ quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) onPhoto(await preparePhoto(asset.uri));
  };

  return (
    <View style={styles.gap}>
      <AppText variant="h1">{t('post.add_photo')}</AppText>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" /> : null}
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button variant="secondary" icon={<Camera size={18} color={colors.ink} />} label={t('post.take_photo')} onPress={() => void pick('camera')} />
        </View>
        <View style={styles.flex}>
          <Button variant="secondary" icon={<ImageIcon size={18} color={colors.ink} />} label={t('post.choose_photo')} onPress={() => void pick('library')} />
        </View>
      </View>
      <TextField label={t('post.caption_placeholder')} value={caption} onChangeText={onCaption} multiline maxLength={280} style={styles.caption} />
      <AppText variant="label">{t('post.preview')}</AppText>
      {offer ? (
        <>
          <CodeCard restaurantName={restaurantName} logoPath={logoPath} discountPercent={offer.discount_percent} capPaise={offer.discount_cap_paise} minBillPaise={offer.min_bill_paise} code={null} qrValue={null} expiresAt={offer.ends_at} remaining={settings.bool('show_live_counters', true) ? offer.remaining : null} total={offer.total_codes} />
          <AppText variant="caption" muted>
            {t('common.shared_with_reward')}
          </AppText>
        </>
      ) : (
        <AppText muted>{t('post.no_offer')}</AppText>
      )}
      <Button label={t('post.publish')} disabled={!photoUri} loading={posting} onPress={onPost} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.card },
  caption: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
});
