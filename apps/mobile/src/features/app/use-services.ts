import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useToast } from '@/lib/toast';
import { flushStories } from '@/lib/story-queue';
import { supabase } from '@/lib/supabase';

/** Live notifications over Realtime, and a periodic retry of queued story uploads while the app is open. */
export function useServices(userId: string | null): void {
  const client = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as { title?: string; body?: string };
        if (row.title) toast.show(`${row.title}. ${row.body ?? ''}`.trim());
        void client.invalidateQueries({ queryKey: ['notifications'] });
        void client.invalidateQueries({ queryKey: ['rpc', 'my_wallet'] });
      })
      .subscribe();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void flushStories().then((r) => {
        if (r.posted.length > 0) void client.invalidateQueries({ queryKey: ['feed'] });
      }).catch(() => undefined);
    }, 30_000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, client, toast]);
}
