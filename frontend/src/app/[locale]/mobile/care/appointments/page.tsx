import { Suspense } from 'react';
import { AppointmentsRefinedScreen } from '@/components/mobile/screens/care/appointments-refined-screen';

export default function MobileCareAppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsRefinedScreen />
    </Suspense>
  );
}
