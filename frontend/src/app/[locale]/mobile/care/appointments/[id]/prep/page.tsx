import { Suspense } from 'react';
import { VisitPrepScreen } from '@/components/mobile/screens/care/visit-prep-screen';

export default function MobileCareVisitPrepPage() {
  return (
    <Suspense fallback={null}>
      <VisitPrepScreen />
    </Suspense>
  );
}
