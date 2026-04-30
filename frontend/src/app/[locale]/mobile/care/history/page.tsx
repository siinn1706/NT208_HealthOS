import { Suspense } from 'react';
import { MedicalHistoryScreen } from '@/components/mobile/screens/care/medical-history-screen';

export default function MobileCareHistoryPage() {
  return (
    <Suspense fallback={null}>
      <MedicalHistoryScreen />
    </Suspense>
  );
}
