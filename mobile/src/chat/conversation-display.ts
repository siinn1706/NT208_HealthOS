import type { Conversation, ConversationParticipant } from '../../../shared/api-contracts';

export interface ConversationDisplay {
  title: string;
  subtitle: string;
  isAi: boolean;
  isOnline: boolean;
}

function pickPeer(
  participants: ConversationParticipant[],
  currentUserId?: string | null,
): ConversationParticipant | null {
  return participants.find((participant) => participant.id !== currentUserId)
    ?? participants[0]
    ?? null;
}

function labelize(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getConversationDisplay(
  conversation: Conversation | null | undefined,
  currentUserId?: string | null,
): ConversationDisplay {
  if (!conversation) {
    return {
      title: 'Conversation',
      subtitle: 'Loading conversation',
      isAi: false,
      isOnline: false,
    };
  }

  const isAi = conversation.type === 'ai';
  const peer = pickPeer(conversation.participants, currentUserId);
  const title = conversation.title
    ?? peer?.display_name
    ?? (isAi ? 'HealthOS AI' : 'Conversation');
  const subtitle = isAi
    ? 'Never medical advice'
    : conversation.type === 'group'
      ? `${conversation.participants.length} members`
      : peer?.role ? labelize(peer.role) : 'Direct chat';

  return {
    title,
    subtitle,
    isAi,
    isOnline: isAi || Boolean(peer?.is_online),
  };
}
