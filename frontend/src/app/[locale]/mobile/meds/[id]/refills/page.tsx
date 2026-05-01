import { Suspense } from 'react';
import { RefillLogScreen } from '@/components/mobile/screens/meds/refill-log-screen';

export default function MobileMedRefillsPage() {
  return (
    <Suspense fallback={null}>
      <RefillLogScreen />
    </Suspense>
  );
}
