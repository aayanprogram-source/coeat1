import { HomeGate } from '@/components/home-gate';
import { OverviewScreen } from '@/features/overview/components/overview-screen';

export default function Page() {
  return (
    <HomeGate>
      <OverviewScreen />
    </HomeGate>
  );
}
