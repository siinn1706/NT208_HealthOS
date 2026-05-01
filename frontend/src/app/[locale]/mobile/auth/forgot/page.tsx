import { Suspense } from 'react';
import { ForgotScreen } from '@/components/mobile/screens/auth/forgot-screen';

export default function MobileAuthForgotPage() {
  return (
    <Suspense fallback={null}>
      <ForgotScreen />
    </Suspense>
  );
}
