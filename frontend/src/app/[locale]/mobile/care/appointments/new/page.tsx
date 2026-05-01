import { Suspense } from 'react';
import { CreateAppointmentScreen } from '@/components/mobile/screens/care/create-appointment-screen';

export default function MobileCareNewAppointmentPage() {
  return (
    <Suspense fallback={null}>
      <CreateAppointmentScreen />
    </Suspense>
  );
}
