import { Suspense } from 'react';
import { HealthProfileSetupScreen } from '@/components/mobile/screens/auth/health-profile-setup-screen';

export default function MobileOnboardingProfilePage() {
  return (
    <Suspense fallback={null}>
      <HealthProfileSetupScreen />
    </Suspense>
  );
}
