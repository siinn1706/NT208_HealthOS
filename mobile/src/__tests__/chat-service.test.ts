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
