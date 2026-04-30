import { Suspense } from 'react';
import { ConfirmSheetScreen } from '@/components/mobile/screens/forms/confirm-sheet-screen';

export default function MobilePatternsConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmSheetScreen />
    </Suspense>
  );
}
