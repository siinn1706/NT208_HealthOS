import { Suspense } from 'react';
import { OtpScreen } from '@/components/mobile/screens/auth/otp-screen';

export default function MobileAuthOtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpScreen />
    </Suspense>
  );
}
