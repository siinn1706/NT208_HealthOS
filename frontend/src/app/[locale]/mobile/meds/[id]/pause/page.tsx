import { Suspense } from 'react';
import { PauseMedScreen } from '@/components/mobile/screens/meds/pause-med-screen';

export default function MobileMedPausePage() {
  return (
    <Suspense fallback={null}>
      <PauseMedScreen />
    </Suspense>
  );
}
