import { useT } from '@/lib/config';
import { CloudOff } from 'lucide-react-native';
import { EmptyState } from './empty-state';

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return <EmptyState icon={CloudOff} title={t('common.error_title')} body={t('common.error_body')} actionLabel={t('common.retry')} onAction={onRetry} />;
}
