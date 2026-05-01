import { Suspense } from 'react';
import { JoinVideoVisitScreen } from '@/components/mobile/screens/care/join-video-visit-screen';

export default function MobileCareJoinVideoPage() {
  return (
    <Suspense fallback={null}>
      <JoinVideoVisitScreen />
    </Suspense>
  );
}
