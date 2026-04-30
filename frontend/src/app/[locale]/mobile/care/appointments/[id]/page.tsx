import { Suspense } from 'react';
import { AppointmentDetailScreen } from '@/components/mobile/screens/care/appointment-detail-screen';

export default function MobileCareAppointmentDetailPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentDetailScreen />
    </Suspense>
  );
}
