import { Suspense } from 'react';
import { ImportMedicationScreen } from '@/components/mobile/screens/meds/import-medication-screen';

export default function MobileMedImportPage() {
  return (
    <Suspense fallback={null}>
      <ImportMedicationScreen />
    </Suspense>
  );
}
