import { Suspense } from 'react';
import { TodayOverviewScreen } from '@/components/mobile/screens/home-detail/today-overview-screen';

export default function MobileHomeTodayPage() {
  return (
    <Suspense fallback={null}>
      <TodayOverviewScreen />
    </Suspense>
  );
}
