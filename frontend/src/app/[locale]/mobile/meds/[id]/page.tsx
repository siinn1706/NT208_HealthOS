import { Suspense } from 'react';
import { MedicationDetailScreen } from '@/components/mobile/screens/meds/medication-detail-screen';

export default function MobileMedDetailPage() {
  return (
    <Suspense fallback={null}>
      <MedicationDetailScreen />
    </Suspense>
  );
}
