import { Suspense } from 'react';
import { EditMedicationScreen } from '@/components/mobile/screens/meds/edit-medication-screen';

export default function MobileMedEditPage() {
  return (
    <Suspense fallback={null}>
      <EditMedicationScreen />
    </Suspense>
  );
}
