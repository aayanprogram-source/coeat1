import { appIds } from '@datapal/core';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/config';
import { routeForUrl } from '@/lib/deep-links';
import { env } from '@/lib/env';
import { useOnline } from '@/lib/network';
import { registerDevice } from '@/lib/push';
import { flushStories } from '@/lib/story-queue';
import { useServices } from './use-services';

/**
 * Sends people to the right place for their state (signed out, onboarding, signed in), opens incoming links,
 * and starts background work: device registration, queued story uploads and live notifications.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pendingLink = useRef<string | null>(null);
  const online = useOnline();
  const settings = useSettings();

  const parts = segments as string[];
  const area = parts[0];
  const screen = parts[1];
  const inAuth = area === '(auth)';

  useEffect(() => {
    if (loading) return;
    void SplashScreen.hideAsync();
    if (!session) {
      if (!inAuth) router.replace('/welcome');
      return;
    }
    if (profile && !profile.onboarding_done) {
      if (!inAuth || (screen !== 'profile-setup' && screen !== 'permissions')) router.replace('/profile-setup');
      return;
    }
    if (inAuth && screen !== 'permissions' && screen !== 'invite') router.replace('/');
  }, [loading, session, profile, inAuth, screen, router]);

  useEffect(() => {
    const open = (url: string | null) => {
      const route = url ? routeForUrl(url, env.linkDomain, appIds.scheme) : null;
      if (!route) return;
      if (session && profile?.onboarding_done) router.push(route);
      else pendingLink.current = route;
    };
    void Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', (event) => open(event.url));
    return () => sub.remove();
  }, [session, profile?.onboarding_done, router]);

  useEffect(() => {
    if (session && profile?.onboarding_done && pendingLink.current) {
      const route = pendingLink.current;
      pendingLink.current = null;
      router.push(route);
    }
  }, [session, profile?.onboarding_done, router]);

  useEffect(() => {
    if (session && profile?.onboarding_done && settings.ready) void registerDevice().catch(() => undefined);
  }, [session, profile?.onboarding_done, settings.ready]);

  useEffect(() => {
    if (session && online) void flushStories().catch(() => undefined);
  }, [session, online]);

  useServices(session?.user.id ?? null);

  return <>{children}</>;
}
