import { Suspense } from 'react';
import { HomeScreen } from '@/components/mobile/screens/home-screen';

export default function MobileHomePage() {
  return (
    <Suspense fallback={null}>
      <HomeScreen />
    </Suspense>
  );
}
