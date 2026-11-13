import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { call } from './rpc';

Notifications.setNotificationHandler({
  handleNotification: () => Promise.resolve({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function deviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync('device-id');
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync('device-id', created);
  return created;
}

/** Registers this device, and its push token when permission is granted and a project is configured. */
export async function registerDevice(): Promise<void> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  let token: string | undefined;
  const settings = await Notifications.getPermissionsAsync();
  const granted = settings.granted || (settings.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (granted && projectId) {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  }
  await call('register_device', { p_device_id: await deviceId(), p_platform: platform, p_push_token: token });
}
