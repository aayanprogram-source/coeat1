import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/ui/app-text';
import { ErrorState } from '@/ui/error-state';
import { Screen } from '@/ui/screen';
import { Skeleton } from '@/ui/skeleton';

export function LegalScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const doc = useQuery({
    queryKey: ['legal', kind],
    queryFn: async () => {
      const { data, error } = await supabase.from('legal_documents').select('title, body, version').eq('kind', kind).not('published_at', 'is', null).order('version', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (doc.isError) return <Screen><ErrorState onRetry={() => void doc.refetch()} /></Screen>;
  return (
    <Screen>
      {doc.isLoading ? <Skeleton height={200} /> : null}
      {doc.data ? (
        <>
          <AppText variant="h1">{doc.data.title}</AppText>
          <AppText>{doc.data.body}</AppText>
        </>
      ) : null}
    </Screen>
  );
}
