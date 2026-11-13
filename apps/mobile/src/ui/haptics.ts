import * as Haptics from 'expo-haptics';

export const haptic = {
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};
