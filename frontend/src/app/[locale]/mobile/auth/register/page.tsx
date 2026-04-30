import { Suspense } from 'react';
import { RegisterScreen } from '@/components/mobile/screens/auth/register-screen';

export default function MobileAuthRegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterScreen />
    </Suspense>
  );
}
