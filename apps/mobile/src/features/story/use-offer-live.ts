import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Refetches a story when its offer changes, so the remaining-codes counter is live on every open screen. */
export function useOfferLive(offerId: string | undefined, storyId: string): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!offerId) return;
    const channel = supabase
      .channel(`offer-${offerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${offerId}` }, () => {
        void client.invalidateQueries({ queryKey: ['story', storyId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [offerId, storyId, client]);
}
