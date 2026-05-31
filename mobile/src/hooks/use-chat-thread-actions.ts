import { useCallback, useState } from 'react';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { chatService } from '../api/services';
import type { ChatAttachmentInput } from '../api/services/chat-service';
import type { Message } from '../../../shared/api-contracts';

interface UseChatThreadActionsOptions {
  conversationId: string;
  isAiThread: boolean;
  canSend: boolean;
  reloadThread: () => Promise<void>;
  appendMessage: (message: Message) => void;
}

export function useChatThreadActions({
  conversationId,
  isAiThread,
  canSend,
  reloadThread,
  appendMessage,
}: UseChatThreadActionsOptions) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

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

  const openAttachmentModal = useCallback(() => {
    if (!canSend) return;
    setAttachError(null);
    setAttachOpen(true);
  }, [canSend]);

  const closeAttachmentModal = useCallback(() => {
    if (attaching) return;
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
    handleSend,
    handleSendAttachment,
    openAttachmentModal,
    closeAttachmentModal,
    dismissSendError: () => setSendError(null),
  };
}
