import { Suspense } from 'react';
import { MedicationHistoryScreen } from '@/components/mobile/screens/meds/medication-history-screen';

export default function MobileMedHistoryPage() {
  return (
    <Suspense fallback={null}>
      <MedicationHistoryScreen />
    </Suspense>
  );
}
