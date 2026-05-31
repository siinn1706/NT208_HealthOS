/* eslint-env jest */
import React from 'react';
import { Pressable as MockPressable, Text as MockText } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import ChatDetailScreen from '../../app/chat/[id]';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { chatService } from '../api/services';
import type { Conversation, Message, MessageListResponse } from '../../../shared/api-contracts';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({ user: { id: 'user-1', display_name: 'Test User' } }),
}));

jest.mock('../hooks/use-chat-websocket', () => ({
  useChatWebSocket: () => ({ state: 'connected', isLive: true }),
}));

jest.mock('../hooks/use-chat-read-receipts', () => ({
  useChatReadReceipts: jest.fn(),
}));

jest.mock('../hooks/use-chat-fallback-polling', () => ({
  useChatFallbackPolling: jest.fn(),
}));

jest.mock('../components/chat/composer', () => ({
  Composer: ({ onSend, disabled }: { onSend?: (text: string) => void; disabled?: boolean }) => {
    return (
      <MockPressable onPress={() => { if (!disabled) onSend?.('Explain my trend'); }}>
        <MockText>Send test</MockText>
      </MockPressable>
    );
  },
}));

jest.mock('../components/chat/chat-thread-header', () => ({
  ChatThreadHeader: ({ display }: { display: { title: string } }) => {
    return <MockText>{display.title}</MockText>;
  },
}));

jest.mock('../components/chat/chat-message-list', () => ({
  ChatMessageList: () => null,
}));

jest.mock('../components/chat/chat-thread-options-modal', () => ({
  ChatThreadOptionsModal: () => null,
}));

jest.mock('../components/chat/attachment-link-modal', () => ({
  AttachmentLinkModal: () => null,
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
  useApiQuery: jest.fn(),
}));

jest.mock('../api/services', () => ({
  chatService: {
    messages: jest.fn(),
    conversation: jest.fn(),
    sendMessage: jest.fn(),
    sendAiMessage: jest.fn(),
    sendAttachmentMessage: jest.fn(),
    markRead: jest.fn(),
  },
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const messageReload = jest.fn().mockResolvedValue(undefined);
const conversationReload = jest.fn().mockResolvedValue(undefined);

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    sender_display_name: 'Test User',
    sender_avatar_url: null,
    sender_kind: 'user',
    client_message_id: null,
    content: 'Explain my trend',
    content_type: 'text',
    attachments: null,
    reply_to_id: null,
    is_recalled: false,
    reactions: [],
    is_pinned: false,
    created_at: '2026-05-31T00:00:00.000Z',
    edited_at: null,
    ...overrides,
  };
}

function conversation(type: Conversation['type']): Conversation {
  return {
    id: 'conv-1',
    type,
    title: type === 'ai' ? 'HealthOS AI' : 'Care Team',
    avatar_url: null,
    participants: [],
    last_message: null,
    unread_count: 0,
    is_muted: false,
    is_pinned: false,
    theme_id: null,
    created_at: '2026-05-31T00:00:00.000Z',
    updated_at: '2026-05-31T00:00:00.000Z',
  };
}

function renderThread(type: Conversation['type'] | null) {
  const page: MessageListResponse = { data: [], has_more: false, next_cursor: null };
  mockUseLocalSearchParams.mockReturnValue({ id: 'conv-1' });
  mockUseApiQuery.mockImplementation((key: string) => ({
    data: key.startsWith('chat.messages.') ? page : type ? conversation(type) : null,
    error: null,
    isLoading: false,
    isRefreshing: false,
    isEmpty: false,
    reload: key.startsWith('chat.messages.') ? messageReload : conversationReload,
  } as never));
  return render(<ChatDetailScreen />);
}

describe('ChatDetailScreen send routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messageReload.mockClear();
    conversationReload.mockClear();
    mockChatService.sendMessage.mockResolvedValue(message());
    mockChatService.sendAiMessage.mockResolvedValue(undefined);
  });

  it('sends AI thread follow-ups through the Core stream route and reloads the transcript', async () => {
    const { getByText } = renderThread('ai');

    fireEvent.press(getByText('Send test'));

    await waitFor(() => expect(mockChatService.sendAiMessage).toHaveBeenCalledWith('conv-1', 'Explain my trend'));
    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    expect(messageReload).toHaveBeenCalled();
    expect(conversationReload).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith('chat.conversations');
  });

  it('keeps direct conversations on the normal message route', async () => {
    const { getByText } = renderThread('direct');

    fireEvent.press(getByText('Send test'));

    await waitFor(() => expect(mockChatService.sendMessage).toHaveBeenCalledWith('conv-1', 'Explain my trend'));
    expect(mockChatService.sendAiMessage).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith('chat.conversations');
  });

  it('blocks sends until the conversation type has loaded', () => {
    const { getByText } = renderThread(null);

    fireEvent.press(getByText('Send test'));

    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    expect(mockChatService.sendAiMessage).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});
