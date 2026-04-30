import { Suspense } from 'react';
import { LoginScreen } from '@/components/mobile/screens/auth/login-screen';

export default function MobileAuthLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
