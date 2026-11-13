import { formatDateTimeIst } from '@datapal/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { AppText } from '@/ui/app-text';
import { Card } from '@/ui/card';
import { EmptyState } from '@/ui/empty-state';
import { ErrorState } from '@/ui/error-state';
import { Screen } from '@/ui/screen';
import { Skeleton } from '@/ui/skeleton';

export function NotificationsScreen() {
  const t = useT();
  const client = useQueryClient();
  const inbox = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('id, title, body, created_at, read_at').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!inbox.data?.some((n) => n.read_at === null)) return;
    void supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .then(() => client.invalidateQueries({ queryKey: ['notifications'] }));
  }, [inbox.data, client]);

  return (
    <Screen>
      <AppText variant="h1">{t('notifications.title')}</AppText>
      {inbox.isError ? <ErrorState onRetry={() => void inbox.refetch()} /> : null}
      {inbox.isLoading ? <Skeleton height={80} /> : null}
      {inbox.data?.length === 0 ? <EmptyState icon={Bell} title={t('notifications.title')} body={t('notifications.empty')} /> : null}
      {(inbox.data ?? []).map((n) => (
        <Card key={n.id} style={n.read_at ? undefined : styles.unread}>
          <View style={styles.gap}>
            <AppText variant="bodyMedium">{n.title}</AppText>
            <AppText muted>{n.body}</AppText>
            <AppText variant="caption" muted>
              {formatDateTimeIst(n.created_at)}
            </AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unread: { borderColor: colors.saffron500 },
  gap: { gap: 4 },
});
