import { Suspense } from 'react';
import { ArchiveMedScreen } from '@/components/mobile/screens/meds/archive-med-screen';

export default function MobileMedArchivePage() {
  return (
    <Suspense fallback={null}>
      <ArchiveMedScreen />
    </Suspense>
  );
}
