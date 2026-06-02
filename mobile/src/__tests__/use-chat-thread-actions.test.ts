/* eslint-env jest */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useChatThreadActions } from '../hooks/use-chat-thread-actions';

const mockNetInfoFetch: jest.Mock = jest.fn();
const mockNetInfoAddEventListener: jest.Mock = jest.fn(() => jest.fn());

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
    addEventListener: (...args: unknown[]) => mockNetInfoAddEventListener(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../auth/session-provider', () => ({
  useSession: () => ({ user: { id: 'user-1', display_name: 'Test User' } }),
}));

jest.mock('../api/query', () => ({
  invalidateApiQuery: jest.fn(),
}));

jest.mock('../api/queryKeys', () => ({
  queryKeys: { conversations: 'conversations' },
}));

const mockUploadImageAttachment = jest.fn();
const mockSendAttachmentMessage = jest.fn();
const mockSendMessage = jest.fn();
const mockSendAiMessage = jest.fn();

jest.mock('../api/services', () => ({
  chatService: {
    uploadImageAttachment: (...args: unknown[]) => mockUploadImageAttachment(...args),
    sendAttachmentMessage: (...args: unknown[]) => mockSendAttachmentMessage(...args),
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    sendAiMessage: (...args: unknown[]) => mockSendAiMessage(...args),
  },
}));

const mockQueueChatImageUpload = jest.fn();
const mockGetQueuedChatImageUploads = jest.fn();
const mockRemoveQueuedChatImageUpload = jest.fn();
const mockIncrementQueuedChatImageAttempts = jest.fn();
const mockIsTransientChatImageUploadError = jest.fn((_err: unknown) => false);

jest.mock('../api/services/chat-offline-queue', () => ({
  queueChatImageUpload: (...args: unknown[]) => mockQueueChatImageUpload(...args),
  getQueuedChatImageUploads: (...args: unknown[]) => mockGetQueuedChatImageUploads(...args),
  removeQueuedChatImageUpload: (...args: unknown[]) => mockRemoveQueuedChatImageUpload(...args),
  incrementQueuedChatImageAttempts: (...args: unknown[]) => mockIncrementQueuedChatImageAttempts(...args),
  isTransientChatImageUploadError: (err: unknown) => mockIsTransientChatImageUploadError(err),
}));

jest.mock('../lib/photo-sanitizer', () => ({
  sanitizePhotoUri: jest.fn(async (uri: string) => ({ uri: `clean:${uri}` })),
}));

jest.mock('../lib/attachment-trust', () => ({
  sanitizeFilenameForAiContext: jest.fn((name: string) => `<<UNTRUSTED>>${name}`),
}));

jest.mock('../utils/file-validation', () => ({
  validateImageFile: jest.fn(() => ({ ok: true })),
}));

const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

const defaultOpts = {
  conversationId: 'conv-1',
  isAiThread: false,
  canSend: true,
  reloadThread: jest.fn().mockResolvedValue(undefined),
  appendMessage: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  mockGetQueuedChatImageUploads.mockResolvedValue([]);
});

describe('useChatThreadActions', () => {
  describe('handleSend', () => {
    it('sends a non-AI message and appends it', async () => {
      const appended = { id: 'msg-1', content: 'hello' };
      mockSendMessage.mockResolvedValueOnce(appended);
      const appendMessage = jest.fn();
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, appendMessage }));

      await act(async () => {
        await result.current.handleSend('hello');
      });

      expect(mockSendMessage).toHaveBeenCalledWith('conv-1', 'hello');
      expect(appendMessage).toHaveBeenCalledWith(appended);
      expect(result.current.sending).toBe(false);
    });

    it('reloads thread for AI thread after send', async () => {
      mockSendAiMessage.mockResolvedValueOnce(undefined);
      const reloadThread = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, isAiThread: true, reloadThread }));

      await act(async () => {
        await result.current.handleSend('AI question');
      });

      expect(mockSendAiMessage).toHaveBeenCalledWith('conv-1', 'AI question');
      expect(reloadThread).toHaveBeenCalled();
    });

    it('sets sendError when send fails', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => {
        await result.current.handleSend('hello');
      });

      expect(result.current.sendError).toBe('Network error');
    });

    it('reloads AI thread even when send fails', async () => {
      const reloadThread = jest.fn().mockResolvedValue(undefined);
      mockSendAiMessage.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, isAiThread: true, reloadThread }));

      await act(async () => {
        await result.current.handleSend('AI question');
      });

      expect(reloadThread).toHaveBeenCalled();
    });

    it('does nothing when canSend=false', async () => {
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, canSend: false }));

      await act(async () => {
        await result.current.handleSend('hello');
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('dismissSendError clears the error', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('err'));
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handleSend('hello'); });
      expect(result.current.sendError).toBe('err');

      act(() => result.current.dismissSendError());
      expect(result.current.sendError).toBeNull();
    });
  });

  describe('handleSendAttachment', () => {
    it('sends an attachment and closes the modal', async () => {
      const attachment = { type: 'image', url: 'http://x.jpg' };
      const appended = { id: 'msg-2', content: '' };
      const appendMessage = jest.fn();
      mockSendAttachmentMessage.mockResolvedValueOnce(appended);
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, appendMessage }));

      await act(async () => {
        await result.current.handleSendAttachment(attachment as never, 'my caption');
      });

      expect(mockSendAttachmentMessage).toHaveBeenCalledWith('conv-1', attachment, 'my caption');
      expect(appendMessage).toHaveBeenCalledWith(appended);
      expect(result.current.attachOpen).toBe(false);
    });

    it('sets attachError when attachment send fails', async () => {
      mockSendAttachmentMessage.mockRejectedValueOnce(new Error('upload failed'));
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => {
        await result.current.handleSendAttachment({} as never, '');
      });

      expect(result.current.attachError).toBe('upload failed');
    });
  });

  describe('openAttachmentModal / closeAttachmentModal', () => {
    it('opens the attachment modal', () => {
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      act(() => result.current.openAttachmentModal());
      expect(result.current.attachOpen).toBe(true);
    });

    it('does not open modal when canSend=false', () => {
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, canSend: false }));

      act(() => result.current.openAttachmentModal());
      expect(result.current.attachOpen).toBe(false);
    });

    it('closes the attachment modal', async () => {
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      act(() => result.current.openAttachmentModal());
      expect(result.current.attachOpen).toBe(true);

      act(() => result.current.closeAttachmentModal());
      expect(result.current.attachOpen).toBe(false);
    });

    it('dismissAttachError clears attach state and error', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });
      expect(result.current.attachState).toBe('error');

      act(() => result.current.dismissAttachError());
      expect(result.current.attachState).toBeNull();
      expect(result.current.attachError).toBeNull();
    });
  });

  describe('handlePickImageAttachment', () => {
    it('sets error when image library permission is denied', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(result.current.attachState).toBe('error');
      expect(result.current.attachError).toBe('chat.imageLibraryPermissionRequired');
    });

    it('does nothing when picker is canceled', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(result.current.attachError).toBeNull();
    });

    it('uploads a valid selected image', async () => {
      const appendMessage = jest.fn();
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1024 }],
      });
      const attachment = { type: 'image', url: 'https://s3/photo.jpg' };
      mockUploadImageAttachment.mockResolvedValueOnce(attachment);
      mockSendAttachmentMessage.mockResolvedValueOnce({ id: 'msg-3', content: '' });
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, appendMessage }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(mockUploadImageAttachment).toHaveBeenCalled();
      expect(appendMessage).toHaveBeenCalled();
      expect(result.current.attachOpen).toBe(false);
    });

    it('queues image on transient upload error', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1024 }],
      });
      mockUploadImageAttachment.mockRejectedValueOnce(new Error('network failure'));
      mockIsTransientChatImageUploadError.mockReturnValueOnce(true);
      mockQueueChatImageUpload.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(mockQueueChatImageUpload).toHaveBeenCalled();
      expect(result.current.attachState).toBe('queued');
    });

    it('sets error for AI thread attachment attempt', async () => {
      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts, isAiThread: true }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(result.current.attachState).toBe('error');
      expect(result.current.attachError).toBe('chat.imageUploadAiUnavailable');
    });

    it('sets error when image file validation fails', async () => {
      const { validateImageFile } = require('../utils/file-validation');
      (validateImageFile as jest.Mock).mockReturnValueOnce({ ok: false, messageKey: 'validation.image.too_large' });

      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://big.jpg', mimeType: 'image/jpeg', fileName: 'big.jpg', fileSize: 999999999 }],
      });

      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(result.current.attachState).toBe('error');
      expect(result.current.attachError).toBe('validation.image.too_large');
    });

    it('sets error when upload fails with non-transient error and no queueing', async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1024 }],
      });
      mockUploadImageAttachment.mockRejectedValueOnce(new Error('server rejected'));
      mockIsTransientChatImageUploadError.mockReturnValueOnce(false);

      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await act(async () => { await result.current.handlePickImageAttachment(); });

      expect(result.current.attachState).toBe('error');
      expect(result.current.attachError).toBe('server rejected');
    });
  });

  describe('retryQueuedImageUploads', () => {
    it('replays queued items on connectivity', async () => {
      const queueItem = {
        id: 'job-1', user_id: 'user-1', conversation_id: 'conv-1',
        uri: 'file://photo.jpg', file_name: 'photo.jpg', mime_type: 'image/jpeg',
        name: 'photo', caption: '', queued_at: 0, attempt_count: 0, file_size: null,
      };
      mockGetQueuedChatImageUploads
        .mockResolvedValueOnce([queueItem])  // initial fetch
        .mockResolvedValueOnce([]);           // after replay fetch

      const attachment = { type: 'image', url: 'https://s3/photo.jpg' };
      mockUploadImageAttachment.mockResolvedValueOnce(attachment);
      mockSendAttachmentMessage.mockResolvedValueOnce({ id: 'msg-4', content: '' });
      mockRemoveQueuedChatImageUpload.mockResolvedValueOnce(undefined);

      const reloadThread = jest.fn().mockResolvedValue(undefined);
      renderHook(() => useChatThreadActions({ ...defaultOpts, reloadThread }));

      await waitFor(() => expect(mockGetQueuedChatImageUploads).toHaveBeenCalled());
    });

    it('skips retry when user has no id', async () => {
      jest.resetModules();
    });

    it('sets error when a non-transient error occurs during retry', async () => {
      const queueItem = {
        id: 'job-2', user_id: 'user-1', conversation_id: 'conv-1',
        uri: 'file://photo.jpg', file_name: 'photo.jpg', mime_type: 'image/jpeg',
        name: 'photo', caption: '', queued_at: 0, attempt_count: 1, file_size: null,
      };
      mockGetQueuedChatImageUploads
        .mockResolvedValueOnce([queueItem])
        .mockResolvedValueOnce([]);

      mockUploadImageAttachment.mockRejectedValueOnce(new Error('permanent failure'));
      mockIsTransientChatImageUploadError.mockReturnValueOnce(false);
      mockRemoveQueuedChatImageUpload.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await waitFor(() => expect(mockGetQueuedChatImageUploads).toHaveBeenCalled());
      await waitFor(() => expect(result.current.attachState).toBe('error'));
      expect(result.current.attachError).toBe('permanent failure');
    });

    it('keeps queued state when items remain after partial retry', async () => {
      const queueItem1 = {
        id: 'job-3', user_id: 'user-1', conversation_id: 'conv-1',
        uri: 'file://photo.jpg', file_name: 'photo.jpg', mime_type: 'image/jpeg',
        name: 'photo', caption: '', queued_at: 0, attempt_count: 0, file_size: null,
      };
      const queueItem2 = {
        id: 'job-4', user_id: 'user-1', conversation_id: 'conv-1',
        uri: 'file://photo2.jpg', file_name: 'photo2.jpg', mime_type: 'image/jpeg',
        name: 'photo2', caption: '', queued_at: 0, attempt_count: 0, file_size: null,
      };
      mockGetQueuedChatImageUploads
        .mockResolvedValueOnce([queueItem1, queueItem2])
        .mockResolvedValueOnce([queueItem2]); // item2 still queued after retry

      const attachment = { type: 'image', url: 'https://s3/photo.jpg' };
      mockUploadImageAttachment
        .mockResolvedValueOnce(attachment)
        .mockRejectedValueOnce(new Error('network'));
      mockSendAttachmentMessage.mockResolvedValueOnce({ id: 'msg-5', content: '' });
      mockRemoveQueuedChatImageUpload.mockResolvedValueOnce(undefined);
      mockIsTransientChatImageUploadError.mockReturnValueOnce(true);
      mockIncrementQueuedChatImageAttempts.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatThreadActions({ ...defaultOpts }));

      await waitFor(() => expect(mockGetQueuedChatImageUploads).toHaveBeenCalled());
      await waitFor(() => expect(result.current.attachState).toBe('queued'));
    });
  });
});
