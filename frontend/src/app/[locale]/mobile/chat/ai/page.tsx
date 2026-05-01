import { Suspense } from 'react';
import { ChatConversationScreen } from '@/components/mobile/screens/chat-conversation-screen';

export default function MobileChatAiPage() {
  return (
    <Suspense fallback={null}>
      <ChatConversationScreen />
    </Suspense>
  );
}
