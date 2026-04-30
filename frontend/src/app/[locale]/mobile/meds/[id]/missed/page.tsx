import { Suspense } from 'react';
import { MissedDoseScreen } from '@/components/mobile/screens/meds/missed-dose-screen';

export default function MobileMedMissedPage() {
  return (
    <Suspense fallback={null}>
      <MissedDoseScreen />
    </Suspense>
  );
}
