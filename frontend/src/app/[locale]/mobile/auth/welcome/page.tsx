import { Suspense } from 'react';
import { WelcomeScreen } from '@/components/mobile/screens/auth/welcome-screen';

export default function MobileAuthWelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeScreen />
    </Suspense>
  );
}
