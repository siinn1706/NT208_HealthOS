import { Suspense } from 'react';
import { TakeMedConfirmScreen } from '@/components/mobile/screens/meds/take-med-confirm-screen';

export default function MobileMedTakePage() {
  return (
    <Suspense fallback={null}>
      <TakeMedConfirmScreen />
    </Suspense>
  );
}
