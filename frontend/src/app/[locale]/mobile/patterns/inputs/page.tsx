import { Suspense } from 'react';
import { FormInputsScreen } from '@/components/mobile/screens/forms/form-inputs-screen';

export default function MobilePatternsInputsPage() {
  return (
    <Suspense fallback={null}>
      <FormInputsScreen />
    </Suspense>
  );
}
