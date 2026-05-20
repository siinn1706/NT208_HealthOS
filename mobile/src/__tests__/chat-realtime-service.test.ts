/* eslint-env jest */
import { buildChatWsUrl, chatRealtimeService } from '../api/services/chat-realtime-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  getCoreWsBaseUrl: jest.fn(() => 'ws://localhost:8000'),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('chatRealtimeService', () => {
  it('requests a short-lived websocket ticket', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { ws_ticket: 'ticket-1', expires_in_seconds: 120 } });

    await expect(chatRealtimeService.wsTicket()).resolves.toEqual({ ws_ticket: 'ticket-1', expires_in_seconds: 120 });

    expect(mockApiRequest).toHaveBeenCalledWith('/v1/auth/ws-ticket');
  });

  it('builds the canonical /ws URL with encoded ticket', () => {
    expect(buildChatWsUrl('a ticket/with symbols', 'wss://api.example.test/')).toBe(
      'wss://api.example.test/ws?token=a%20ticket%2Fwith%20symbols',
    );
  });
});
