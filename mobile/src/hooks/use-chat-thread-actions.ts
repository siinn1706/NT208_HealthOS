import { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { useSession } from '../auth/session-provider';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { chatService } from '../api/services';
import type { ChatAttachmentInput } from '../api/services/chat-service';
import {
  getQueuedChatImageUploads,
  incrementQueuedChatImageAttempts,
  isTransientChatImageUploadError,
  queueChatImageUpload,
  removeQueuedChatImageUpload,
  type ChatImageQueueItem,
} from '../api/services/chat-offline-queue';
import { sanitizePhotoUri } from '../lib/photo-sanitizer';
import { sanitizeFilenameForAiContext } from '../lib/attachment-trust';
import { validateImageFile } from '../utils/file-validation';
import type { Message } from '../../../shared/api-contracts';

interface UseChatThreadActionsOptions {
  conversationId: string;
  isAiThread: boolean;
  canSend: boolean;
  reloadThread: () => Promise<void>;
  appendMessage: (message: Message) => void;
}

interface QueuedImageInput {
  uri: string;
  fileName: string;
  mimeType: string;
  name: string;
  caption: string;
  fileSize: number | null | undefined;
}

type AttachState = 'error' | 'queued' | 'retrying' | null;

export function useChatThreadActions({
  conversationId,
  isAiThread,
  canSend,
  reloadThread,
  appendMessage,
}: UseChatThreadActionsOptions) {
  const { t: i18n } = useTranslation();
  const { user } = useSession();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachState, setAttachState] = useState<AttachState>(null);
  const mountedAtRef = useRef(Date.now());
  const replayingRef = useRef(false);

  const queueImageForRetry = useCallback(async (payload: QueuedImageInput) => {
    if (!user?.id) {
      setAttachState('error');
      setAttachError(i18n('chat.imageUploadFailed'));
      return;
    }

    await queueChatImageUpload({
      user_id: user.id,
      conversation_id: conversationId,
      uri: payload.uri,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      name: payload.name,
      caption: payload.caption,
      file_size: payload.fileSize ?? null,
    });

    setAttachState('queued');
    setAttachError(i18n('chat.imageUploadQueued'));
    setAttachOpen(false);
  }, [conversationId, i18n, user?.id]);

  const sendQueuedImage = useCallback(async (item: ChatImageQueueItem) => {
    const attachment = await chatService.uploadImageAttachment({
      uri: item.uri,
      name: item.file_name,
      type: item.mime_type,
    });
    appendMessage(await chatService.sendAttachmentMessage(conversationId, attachment, item.caption));
    await removeQueuedChatImageUpload({ user_id: item.user_id, job_id: item.id });
  }, [appendMessage, conversationId]);

  const retryQueuedImageUploads = useCallback(async (options: { includeFresh?: boolean } = {}) => {
    if (!user?.id || !conversationId || !canSend || replayingRef.current) return;

    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) return;

    const queued = await getQueuedChatImageUploads({ user_id: user.id, conversation_id: conversationId });
    const eligible = options.includeFresh
      ? queued
      : queued.filter((item) => item.queued_at < mountedAtRef.current);
    if (eligible.length === 0) return;

    replayingRef.current = true;
    let replayedAny = false;
    let blockingError: string | null = null;

    try {
      for (const item of eligible) {
        try {
          setAttachState('retrying');
          setAttachError(i18n('chat.imageUploadRetrying'));
          await sendQueuedImage(item);
          replayedAny = true;
        } catch (error: unknown) {
          await incrementQueuedChatImageAttempts({ user_id: user.id, job_id: item.id });
          if (!isTransientChatImageUploadError(error)) {
            await removeQueuedChatImageUpload({ user_id: user.id, job_id: item.id });
            blockingError = error instanceof Error ? error.message : i18n('chat.imageUploadFailed');
            break;
          }
        }
      }
    } finally {
      replayingRef.current = false;
      const remaining = await getQueuedChatImageUploads({ user_id: user.id, conversation_id: conversationId });
      if (blockingError) {
        setAttachState('error');
        setAttachError(blockingError);
      } else if (remaining.length > 0) {
        setAttachState('queued');
        setAttachError(i18n('chat.imageUploadQueued'));
      } else {
        setAttachState(null);
        setAttachError(null);
        if (replayedAny) {
          invalidateApiQuery(queryKeys.conversations);
          void reloadThread();
        }
      }
    }
  }, [canSend, conversationId, i18n, sendQueuedImage, user?.id, reloadThread]);

  useEffect(() => {
    if (!conversationId || !canSend || !user?.id) return;

    void retryQueuedImageUploads({ includeFresh: false });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void retryQueuedImageUploads({ includeFresh: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [canSend, conversationId, retryQueuedImageUploads, user?.id]);

  const handleSend = useCallback(async (text: string) => {
    if (!conversationId || !canSend) return;
    setSending(true);
    setSendError(null);
    try {
      if (isAiThread) {
        await chatService.sendAiMessage(conversationId, text);
        await reloadThread();
      } else {
        appendMessage(await chatService.sendMessage(conversationId, text));
      }
      invalidateApiQuery(queryKeys.conversations);
    } catch (err: unknown) {
      if (isAiThread) void reloadThread();
      setSendError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [appendMessage, canSend, conversationId, isAiThread, reloadThread]);

  const handleSendAttachment = useCallback(async (attachment: ChatAttachmentInput, caption: string) => {
    if (!conversationId || !canSend) return;
    setAttaching(true);
    setAttachError(null);
    try {
      appendMessage(await chatService.sendAttachmentMessage(conversationId, attachment, caption));
      invalidateApiQuery(queryKeys.conversations);
      setAttachOpen(false);
    } catch (err: unknown) {
      setAttachError(err instanceof Error ? err.message : 'Failed to send attachment. Please try again.');
    } finally {
      setAttaching(false);
    }
  }, [appendMessage, canSend, conversationId]);

  const handlePickImageAttachment = useCallback(async () => {
    if (!conversationId || !canSend || attaching) return;
    if (isAiThread) {
      setAttachState('error');
      setAttachError(i18n('chat.imageUploadAiUnavailable'));
      return;
    }

    setAttaching(true);
    setAttachState(null);
    setAttachError(null);
    let attachmentFile: QueuedImageInput | null = null;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAttachState('error');
        setAttachError(i18n('chat.imageLibraryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
        // Instruct the picker not to include EXIF in the returned asset.
        // sanitizePhotoUri() performs a second-pass re-encode for defence-in-depth.
        exif: false,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      // Re-encode through ImageManipulator to strip residual EXIF / PHI
      // (GPS coordinates, device serial, capture timestamp).
      const clean = await sanitizePhotoUri(asset.uri);
      const ext = asset.mimeType?.split('/')[1] || 'jpg';
      const rawFileName = asset.fileName || `chat-image.${ext === 'jpeg' ? 'jpg' : ext}`;
      attachmentFile = {
        uri: clean.uri,
        fileName: rawFileName,
        mimeType: asset.mimeType || 'image/jpeg',
        // Wrap name in <<UNTRUSTED>> marker so that when sendAttachmentMessage
        // uses it as fallback message content the AI model sees it as user data,
        // not as an instruction (prompt-injection mitigation).
        name: sanitizeFilenameForAiContext(rawFileName),
        caption: '',
        fileSize: asset.fileSize,
      };

      const validation = validateImageFile({
        uri: attachmentFile.uri,
        fileName: attachmentFile.fileName,
        mimeType: attachmentFile.mimeType,
        fileSize: attachmentFile.fileSize ?? undefined,
      });
      if (!validation.ok) {
        setAttachState('error');
        setAttachError(i18n(validation.messageKey ?? 'validation.image.bad_mime', validation.messageParams));
        return;
      }

      const attachment = await chatService.uploadImageAttachment({
        uri: attachmentFile.uri,
        name: attachmentFile.fileName,
        type: attachmentFile.mimeType,
      });
      appendMessage(await chatService.sendAttachmentMessage(conversationId, attachment, attachmentFile.caption));
      invalidateApiQuery(queryKeys.conversations);
      setAttachOpen(false);
    } catch (err: unknown) {
      if (attachmentFile && isTransientChatImageUploadError(err)) {
        await queueImageForRetry(attachmentFile);
        return;
      }
      setAttachState('error');
      setAttachError(err instanceof Error ? err.message : i18n('chat.imageUploadFailed'));
    } finally {
      setAttaching(false);
    }
  }, [appendMessage, attaching, canSend, conversationId, i18n, isAiThread, queueImageForRetry]);

  const openAttachmentModal = useCallback(() => {
    if (!canSend) return;
    setAttachState(null);
    setAttachError(null);
    setAttachOpen(true);
  }, [canSend]);

  const closeAttachmentModal = useCallback(() => {
    if (attaching) return;
    setAttachState(null);
    setAttachError(null);
    setAttachOpen(false);
  }, [attaching]);

  return {
    sending,
    sendError,
    canSend,
    attachOpen,
    attaching,
    attachError,
    attachState,
    handleSend,
    handleSendAttachment,
    handlePickImageAttachment,
    openAttachmentModal,
    closeAttachmentModal,
    dismissSendError: () => setSendError(null),
    dismissAttachError: () => {
      setAttachState(null);
      setAttachError(null);
    },
  };
}
