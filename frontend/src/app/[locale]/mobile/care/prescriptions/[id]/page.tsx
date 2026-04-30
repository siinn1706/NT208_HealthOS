import { Suspense } from 'react';
import { PrescriptionDetailScreen } from '@/components/mobile/screens/care/prescription-detail-screen';

export default function MobileCarePrescriptionDetailPage() {
  return (
    <Suspense fallback={null}>
      <PrescriptionDetailScreen />
    </Suspense>
  );
}
