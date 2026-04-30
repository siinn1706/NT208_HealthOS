import { Suspense } from 'react';
import { ProfileScreen } from '@/components/mobile/screens/profile-screen';

export default function MobileProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileScreen />
    </Suspense>
  );
}
