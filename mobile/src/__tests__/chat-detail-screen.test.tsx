/* eslint-env jest */
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable as MockPressable, Text as MockText } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import ChatDetailScreen from '../../app/chat/[id]';
import { ApiError } from '../api/client';
import { invalidateApiQuery, useApiQuery } from '../api/query';
import { chatService } from '../api/services';
import { getQueuedChatImageUploads } from '../api/services/chat-offline-queue';
import type { Conversation, Message, MessageListResponse } from '../../../shared/api-contracts';

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNetInfoFetch = jest.fn();
const mockNetInfoAddEventListener = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
    addEventListener: (...args: unknown[]) => mockNetInfoAddEventListener(...args),
  },
}));

jest.mock('../theme/useTheme', () => {
  const { palettes } = jest.requireActual('../theme/palettes');
  return { useTheme: () => palettes.calm };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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
  Composer: ({
    onSend,
    onAttach,
    disabled,
  }: {
    onSend?: (text: string) => void;
    onAttach?: () => void;
    disabled?: boolean;
  }) => {
    return (
      <>
        <MockPressable onPress={() => { if (!disabled) onSend?.('Explain my trend'); }}>
          <MockText>Send test</MockText>
        </MockPressable>
        <MockPressable onPress={() => { if (!disabled) onAttach?.(); }}>
          <MockText>Attach image test</MockText>
        </MockPressable>
      </>
    );
  },
}));

jest.mock('../components/chat/chat-thread-header', () => ({
  ChatThreadHeader: ({ display }: { display: { title: string } }) => {
    return <MockText>{display.title}</MockText>;
  },
}));

let latestMessageListProps: Record<string, unknown> | null = null;

jest.mock('../components/chat/chat-message-list', () => ({
  ChatMessageList: (props: Record<string, unknown>) => {
    latestMessageListProps = props;
    return props.sendError ? <MockText>{String(props.sendError)}</MockText> : null;
  },
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
    uploadImageAttachment: jest.fn(),
    markRead: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;
const mockRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestMediaLibraryPermissionsAsync>;
const mockLaunchImageLibraryAsync =
  ImagePicker.launchImageLibraryAsync as jest.MockedFunction<typeof ImagePicker.launchImageLibraryAsync>;
const messageReload = jest.fn().mockResolvedValue(undefined);
const conversationReload = jest.fn().mockResolvedValue(undefined);
let netInfoListener: ((state: { isConnected: boolean | null; isInternetReachable: boolean | null; }) => void) | null = null;

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
  const originalPlatformOS = Platform.OS;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    messageReload.mockClear();
    conversationReload.mockClear();
    latestMessageListProps = null;
    netInfoListener = null;
    mockChatService.sendMessage.mockResolvedValue(message());
    // sendAiMessage returns { client_message_id } for WS dedup; screen ignores the value.
    mockChatService.sendAiMessage.mockResolvedValue({ client_message_id: 'mobile-mock-id' } as never);
    mockChatService.uploadImageAttachment.mockResolvedValue({
      url: 'https://cdn.example.com/image.jpg',
      name: 'queued.jpg',
      size: 1234,
      mime_type: 'image/jpeg',
    });
    mockChatService.sendAttachmentMessage.mockResolvedValue(message({
      id: 'msg-image-1',
      content: '',
      content_type: 'image',
      attachments: [{
        url: 'https://cdn.example.com/image.jpg',
        name: 'queued.jpg',
        size: 1234,
        mime_type: 'image/jpeg',
      }],
    }));
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof ImagePicker.requestMediaLibraryPermissionsAsync>>);
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file:///queued-image.jpg',
        fileName: 'queued-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1234,
        width: 80,
        height: 80,
      }],
    } as Awaited<ReturnType<typeof ImagePicker.launchImageLibraryAsync>>);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockNetInfoAddEventListener.mockImplementation((listener: typeof netInfoListener) => {
      netInfoListener = listener;
      return jest.fn();
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
  });

  it('uses Android keyboard height avoidance so the thread resizes above the keyboard', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const { UNSAFE_getByType } = renderThread('direct');

    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height');
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

  it('queues image attachments after a transient upload failure and surfaces queued state', async () => {
    mockChatService.uploadImageAttachment.mockRejectedValueOnce(new ApiError('offline', 0, 'CORE_UNREACHABLE'));

    const { getByText } = renderThread('direct');
    fireEvent.press(getByText('Attach image test'));

    await waitFor(() => expect(mockChatService.uploadImageAttachment).toHaveBeenCalled());
    const queued = await getQueuedChatImageUploads({ user_id: 'user-1', conversation_id: 'conv-1' });
    expect(queued).toHaveLength(1);
    expect(latestMessageListProps?.sendState).toBe('queued');
    expect(latestMessageListProps?.sendError).toBe('chat.imageUploadQueued');
    expect(mockChatService.sendAttachmentMessage).not.toHaveBeenCalled();
  });

  it('retries queued image attachments when connectivity returns', async () => {
    mockChatService.uploadImageAttachment.mockRejectedValueOnce(new Error('Network request failed'));

    const { getByText } = renderThread('direct');
    fireEvent.press(getByText('Attach image test'));

    await waitFor(() => expect(mockChatService.uploadImageAttachment).toHaveBeenCalled());
    expect(await getQueuedChatImageUploads({ user_id: 'user-1', conversation_id: 'conv-1' })).toHaveLength(1);
    expect(latestMessageListProps?.sendState).toBe('queued');

    mockChatService.uploadImageAttachment.mockResolvedValue({
      url: 'https://cdn.example.com/image.jpg',
      name: 'queued.jpg',
      size: 1234,
      mime_type: 'image/jpeg',
    });

    await act(async () => {
      netInfoListener?.({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(async () => {
      expect(mockChatService.sendAttachmentMessage).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ url: 'https://cdn.example.com/image.jpg' }),
        '',
      );
      const queued = await getQueuedChatImageUploads({ user_id: 'user-1', conversation_id: 'conv-1' });
      expect(queued).toHaveLength(0);
      expect(latestMessageListProps?.sendError).toBeNull();
    });
  });
});
