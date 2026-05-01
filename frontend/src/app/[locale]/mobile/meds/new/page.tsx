import { Suspense } from 'react';
import { AddMedicationScreen } from '@/components/mobile/screens/meds/add-medication-screen';

export default function MobileMedNewPage() {
  return (
    <Suspense fallback={null}>
      <AddMedicationScreen />
    </Suspense>
  );
}
