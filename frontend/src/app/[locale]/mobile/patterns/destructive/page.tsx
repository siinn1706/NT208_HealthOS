import { Suspense } from 'react';
import { DestructiveDialogScreen } from '@/components/mobile/screens/forms/destructive-dialog-screen';

export default function MobilePatternsDestructivePage() {
  return (
    <Suspense fallback={null}>
      <DestructiveDialogScreen />
    </Suspense>
  );
}
