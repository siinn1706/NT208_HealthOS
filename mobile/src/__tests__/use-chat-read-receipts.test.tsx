/* eslint-env jest */
import { renderHook, waitFor } from '@testing-library/react-native';
import { invalidateApiQuery } from '../api/query';
import { chatService } from '../api/services';
import { useChatReadReceipts } from '../hooks/use-chat-read-receipts';

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/queryKeys', () => ({
  queryKeys: { conversations: 'chat.conversations' },
}));

jest.mock('../api/services', () => ({
  chatService: {
    markRead: jest.fn(),
  },
}));

const mockMarkRead = chatService.markRead as jest.MockedFunction<typeof chatService.markRead>;
const mockInvalidate = invalidateApiQuery as jest.MockedFunction<typeof invalidateApiQuery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkRead.mockResolvedValue(undefined);
});

describe('useChatReadReceipts', () => {
  it('marks the latest loaded message as read and refreshes conversation badges', async () => {
    renderHook(() => useChatReadReceipts({
      conversationId: 'conv-1',
      latestMessageId: 'msg-9',
    }));

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('conv-1', 'msg-9'));
    await waitFor(() => expect(mockInvalidate).toHaveBeenCalledWith('chat.conversations'));
  });

  it('does not repeat the same read cursor but advances to a newer message', async () => {
    const hook = renderHook(
      (props) => {
        const { latestMessageId } = props as { latestMessageId: string };
        useChatReadReceipts({
          conversationId: 'conv-1',
          latestMessageId,
        });
      },
      { initialProps: { latestMessageId: 'msg-1' } },
    );

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledTimes(1));

    hook.rerender({ latestMessageId: 'msg-1' });
    expect(mockMarkRead).toHaveBeenCalledTimes(1);

    hook.rerender({ latestMessageId: 'msg-2' });
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledTimes(2));
    expect(mockMarkRead).toHaveBeenLastCalledWith('conv-1', 'msg-2');
  });

  it('does not call Core when disabled or missing ids', () => {
    renderHook(() => useChatReadReceipts({
      conversationId: 'conv-1',
      latestMessageId: 'msg-1',
      enabled: false,
    }));
    renderHook(() => useChatReadReceipts({
      conversationId: '',
      latestMessageId: 'msg-1',
    }));
    renderHook(() => useChatReadReceipts({
      conversationId: 'conv-1',
      latestMessageId: null,
    }));

    expect(mockMarkRead).not.toHaveBeenCalled();
  });
});
