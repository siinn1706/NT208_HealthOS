import { Suspense } from 'react';
import { HealthScoreDetailScreen } from '@/components/mobile/screens/home-detail/health-score-detail-screen';

export default function MobileHomeScorePage() {
  return (
    <Suspense fallback={null}>
      <HealthScoreDetailScreen />
    </Suspense>
  );
}
