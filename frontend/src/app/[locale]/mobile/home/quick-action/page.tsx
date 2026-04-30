import { Suspense } from 'react';
import { QuickActionSheetScreen } from '@/components/mobile/screens/home-detail/quick-action-sheet-screen';

export default function MobileHomeQuickActionPage() {
  return (
    <Suspense fallback={null}>
      <QuickActionSheetScreen />
    </Suspense>
  );
}
