import { Suspense } from 'react';
import { FormPickersScreen } from '@/components/mobile/screens/forms/form-pickers-screen';

export default function MobilePatternsPickersPage() {
  return (
    <Suspense fallback={null}>
      <FormPickersScreen />
    </Suspense>
  );
}
