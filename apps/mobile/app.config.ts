import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExpoConfig } from 'expo/config';

// The one .env at the repository root is the only source of these values.
const rootEnv = resolve(__dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'LINK_DOMAIN'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) throw new Error(`Environment is incomplete. Fill these names in .env: ${missing.join(', ')}`);

const ids = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'packages', 'core', 'app-ids.json'), 'utf8')) as {
  displayName: string;
  ios: string;
  android: string;
  scheme: string;
};
const domain = process.env.LINK_DOMAIN as string;

const config: ExpoConfig = {
  name: ids.displayName,
  slug: ids.scheme,
  version: '1.0.0',
  scheme: ids.scheme,
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: ids.ios,
    supportsTablet: false,
    associatedDomains: [`applinks:${domain}`],
    infoPlist: {
      NSCameraUsageDescription: 'The camera is used to photograph your meal and to scan table codes.',
      NSLocationWhenInUseUsageDescription: 'Your location is used to find nearby restaurants and to verify check-ins.',
      NSContactsUsageDescription: 'Contacts are matched on your phone using scrambled numbers to find friends. They are never uploaded.',
      NSPhotoLibraryUsageDescription: 'Choose a photo of your meal to post.',
    },
  },
  android: {
    package: ids.android,
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'READ_CONTACTS', 'POST_NOTIFICATIONS'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: domain, pathPrefix: '/s' }, { scheme: 'https', host: domain, pathPrefix: '/p' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ['expo-camera', { cameraPermission: 'The camera is used to photograph your meal and to scan table codes.' }],
    ['expo-location', { locationWhenInUsePermission: 'Your location is used to find nearby restaurants and to verify check-ins.' }],
    ['expo-contacts', { contactsPermission: 'Contacts are matched on your phone using scrambled numbers to find friends.' }],
    'expo-notifications',
    ['expo-image-picker', { photosPermission: 'Choose a photo of your meal to post.' }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    linkDomain: domain,
  },
};

export default config;
