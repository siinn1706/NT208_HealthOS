import { useEffect, useRef } from 'react';
import { invalidateApiQuery } from '../api/query';
import { queryKeys } from '../api/queryKeys';
import { chatService } from '../api/services';

interface UseChatReadReceiptsOptions {
  conversationId: string;
  latestMessageId?: string | null;
  enabled?: boolean;
}

export function useChatReadReceipts({
  conversationId,
  latestMessageId,
  enabled = true,
}: UseChatReadReceiptsOptions) {
  const lastMarkedRef = useRef<string | null>(null);
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    lastMarkedRef.current = null;
    inFlightRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!enabled || !conversationId || !latestMessageId) return;
    if (lastMarkedRef.current === latestMessageId || inFlightRef.current === latestMessageId) return;

    let cancelled = false;
    inFlightRef.current = latestMessageId;

    chatService.markRead(conversationId, latestMessageId)
      .then(() => {
        if (cancelled) return;
        lastMarkedRef.current = latestMessageId;
        invalidateApiQuery(queryKeys.conversations);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled && inFlightRef.current === latestMessageId) {
          inFlightRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, enabled, latestMessageId]);
}
