import { Button } from '@/ui/button';

export function NotifyButton({ offerId, onNotify, label }: { offerId: string; onNotify: (offerId: string) => Promise<void>; label: string }) {
  return <Button label={label} onPress={() => void onNotify(offerId)} />;
}
