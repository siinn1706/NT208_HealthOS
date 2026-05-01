import { Suspense } from 'react';
import { VitalsDetailScreen } from '@/components/mobile/screens/home-detail/vitals-detail-screen';

export default function MobileHomeVitalsPage() {
  return (
    <Suspense fallback={null}>
      <VitalsDetailScreen />
    </Suspense>
  );
}
