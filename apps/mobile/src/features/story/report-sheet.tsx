import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppConfig, useT } from '@/lib/config';
import { useRpcMutation } from '@/lib/rpc';
import { AppText } from '@/ui/app-text';
import { BottomSheet } from '@/ui/bottom-sheet';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';

export function ReportSheet({ storyId, visible, onClose }: { storyId: string; visible: boolean; onClose: () => void }) {
  const t = useT();
  const config = useAppConfig();
  const [reason, setReason] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const report = useRpcMutation('report_story');

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={t('common.close')}>
      <AppText variant="h2">{done ? t('story.reported') : t('common.report')}</AppText>
      {done ? (
        <Button label={t('common.done')} onPress={onClose} />
      ) : (
        <>
          <View style={styles.chips}>
            {(config?.report_reasons ?? []).map((r) => (
              <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
            ))}
          </View>
          <Button label={t('common.report')} disabled={!reason} loading={report.isPending} onPress={() => reason && report.mutate({ p_story_id: storyId, p_reason_id: reason, p_note: '' }, { onSuccess: () => setDone(true) })} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
