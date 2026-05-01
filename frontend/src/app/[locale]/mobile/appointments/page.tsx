import { Suspense } from 'react';
import { AppointmentsScreen } from '@/components/mobile/screens/appointments-screen';

export default function MobileAppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsScreen />
    </Suspense>
  );
}
