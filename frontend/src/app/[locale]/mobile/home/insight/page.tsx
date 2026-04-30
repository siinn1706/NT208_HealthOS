import { Suspense } from 'react';
import { AiInsightDetailScreen } from '@/components/mobile/screens/home-detail/ai-insight-detail-screen';

export default function MobileHomeInsightPage() {
  return (
    <Suspense fallback={null}>
      <AiInsightDetailScreen />
    </Suspense>
  );
}
