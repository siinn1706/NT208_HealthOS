/* eslint-env jest */
import { apiRequest, buildQuery } from '../api/client';
import { chatService } from '../api/services/chat-service';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.fn((params: Record<string, unknown>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
  }),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockBuildQuery = buildQuery as jest.MockedFunction<typeof buildQuery>;

beforeEach(() => jest.clearAllMocks());

describe('chatService conversations', () => {
  it('lists accepted conversations through the Core contract', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [{ id: 'conv-1' }], total: 1 } as never);

    await expect(chatService.conversations()).resolves.toEqual([{ id: 'conv-1' }]);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations');
  });

  it('loads conversation detail by encoded id', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'conv/1' } } as never);

    await expect(chatService.conversation('conv/1')).resolves.toEqual({ id: 'conv/1' });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv%2F1');
  });
});

describe('chatService.messages', () => {
  it('preserves has_more and next_cursor while normalizing oldest-first order', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [
        { id: 'm2', created_at: '2026-05-20T12:01:00.000Z' },
        { id: 'm1', created_at: '2026-05-20T12:00:00.000Z' },
      ],
      has_more: true,
      next_cursor: '2026-05-20T12:00:00.000Z',
    } as never);

    const result = await chatService.messages('conv-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv-1/messages?limit=50');
    expect(result.data.map((item) => item.id)).toEqual(['m1', 'm2']);
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe('2026-05-20T12:00:00.000Z');
  });

  it('forwards encoded before cursor and custom limit', async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: [],
      has_more: false,
      next_cursor: null,
    } as never);

    await chatService.messages('conv/1', {
      before: '2026-05-20T10:00:00.000Z',
      limit: 20,
    });

    expect(mockBuildQuery).toHaveBeenCalledWith({
      limit: 20,
      before: '2026-05-20T10:00:00.000Z',
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/v1/conversations/conv%2F1/messages?limit=20&before=2026-05-20T10%3A00%3A00.000Z',
    );
  });
});

describe('chatService conversation creation', () => {
  it('creates or opens the real AI conversation without a seed prompt', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'ai-conv' } } as never);

    await expect(chatService.createAiConversation()).resolves.toEqual({ id: 'ai-conv' });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/ai', {
      method: 'POST',
      json: undefined,
    });
  });

  it('passes AI suggestion text as Core initial_message', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'ai-conv' } } as never);

    await chatService.createAiConversation('Summarize my health this week');

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/ai', {
      method: 'POST',
      json: { initial_message: 'Summarize my health this week' },
    });
  });

  it('searches existing users through Core lookup', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] } as never);

    await chatService.lookupUsers('nguyen', 20);

    expect(mockBuildQuery).toHaveBeenCalledWith({ q: 'nguyen', limit: 20 });
    expect(mockApiRequest).toHaveBeenCalledWith('/v1/users/lookup?q=nguyen&limit=20');
  });

  it('creates direct conversations with target_user_id', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'conv-1' } } as never);

    await chatService.createDirectConversation('user-2');

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/direct', {
      method: 'POST',
      json: { target_user_id: 'user-2' },
    });
  });

  it('creates group conversations with title and member_ids', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'conv-2' } } as never);

    await chatService.createGroupConversation('Care team', ['user-2', 'user-3']);

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations', {
      method: 'POST',
      json: { title: 'Care team', member_ids: ['user-2', 'user-3'] },
    });
  });

  it('marks a conversation read up to the latest message', async () => {
    mockApiRequest.mockResolvedValueOnce(undefined as never);

    await chatService.markRead('conv/1', 'message-9');

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv%2F1/read', {
      method: 'POST',
      json: { last_read_message_id: 'message-9' },
    });
  });
});

describe('chatService.sendAttachmentMessage', () => {
  it('sends attachment metadata through the existing message contract', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'msg-1' } } as never);

    await chatService.sendAttachmentMessage('conv/1', {
      url: 'https://example.test/labs.pdf',
      name: 'Labs.pdf',
      size: 1234,
      mime_type: 'application/pdf',
    }, 'Latest labs');

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv%2F1/messages', {
      method: 'POST',
      json: {
        content: 'Latest labs',
        content_type: 'file',
        client_message_id: expect.stringMatching(/^mobile-\d+-\d+$/),
        attachments: [{
          url: 'https://example.test/labs.pdf',
          name: 'Labs.pdf',
          size: 1234,
          mime_type: 'application/pdf',
        }],
      },
    });
  });

  it('uses image content type and a stable fallback caption for image links', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'msg-2' } } as never);

    await chatService.sendAttachmentMessage('conv-1', {
      url: 'https://example.test/photo.jpg',
      name: 'Photo.jpg',
      size: 0,
      mime_type: 'image/jpeg',
    });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv-1/messages', {
      method: 'POST',
      json: expect.objectContaining({
        content: 'Shared attachment: Photo.jpg',
        content_type: 'image',
      }),
    });
  });

  it('propagates Core attachment rejection instead of faking success', async () => {
    mockApiRequest.mockRejectedValueOnce(new Error('Core rejected attachment'));

    await expect(chatService.sendAttachmentMessage('conv-1', {
      url: 'https://example.test/labs.pdf',
      name: 'Labs.pdf',
      size: 1234,
      mime_type: 'application/pdf',
    })).rejects.toThrow('Core rejected attachment');
  });
});

describe('chatService.sendAiMessage', () => {
  it('uses the Core SSE stream endpoint for AI follow-up messages', async () => {
    mockApiRequest.mockResolvedValueOnce('event: done\ndata: {"status":"completed"}\n\n' as never);

    await expect(chatService.sendAiMessage('conv/ai', 'Explain my trend')).resolves.toBeUndefined();

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/conversations/conv%2Fai/messages/stream', {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      timeoutMs: 120000,
      json: {
        content: 'Explain my trend',
        content_type: 'text',
        client_message_id: expect.stringMatching(/^mobile-\d+-\d+$/),
        attachments: undefined,
      },
    });
  });

  it('surfaces SSE error events instead of treating the stream as success', async () => {
    mockApiRequest.mockResolvedValueOnce('event: error\ndata: {"detail":"AI worker unavailable"}\n\n' as never);

    await expect(chatService.sendAiMessage('conv-1', 'Retry')).rejects.toThrow('AI worker unavailable');
  });
});
