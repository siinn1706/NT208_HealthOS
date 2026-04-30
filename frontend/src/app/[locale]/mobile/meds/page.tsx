import { Suspense } from 'react';
import { MedicationsScreen } from '@/components/mobile/screens/medications-screen';

export default function MobileMedsPage() {
  return (
    <Suspense fallback={null}>
      <MedicationsScreen />
    </Suspense>
  );
}
