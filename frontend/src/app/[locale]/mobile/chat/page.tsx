import { Suspense } from 'react';
import { ChatListScreen } from '@/components/mobile/screens/chat-list-screen';

export default function MobileChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatListScreen />
    </Suspense>
  );
}
