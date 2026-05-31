"use client";

import type { ComponentPropsWithoutRef, Ref } from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Virtuoso, type VirtuosoHandle, type ListRange } from "react-virtuoso";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ScrollToEndButton } from "./ScrollToEndButton";
import { ScrollTimeChip } from "./ScrollTimeChip";
import { DateJumpSheet } from "./DateJumpSheet";
import {
  formatDateSeparator,
  getGroupPosition,
  getBubbleRadius,
  shouldShowTimestamp,
} from "@/lib/chat-utils";
import { useLocale } from "next-intl";
import type { Message } from "@/types/api";

const INITIAL_FIRST_ITEM_INDEX = 100_000;
const MAX_DATE_JUMP_LOADS = 40;

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function findFirstIndexForDate(messages: Message[], targetDateKey: string): number | undefined {
  for (let i = 0; i < messages.length; i += 1) {
    if (getDateKey(new Date(messages[i].created_at)) === targetDateKey) return i;
  }
  return undefined;
}

type ChatVirtuosoListProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>;
};

function ChatVirtuosoList({ style, children, ref, ...props }: ChatVirtuosoListProps) {
    return (
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role -- react-virtuoso measures a div list wrapper.
      <div ref={ref} role="list" style={style} {...props}>
        {children}
      </div>
    );
}

interface MessageListProps {
  ref?: Ref<MessageListHandle>;
  conversationId: string;
  messages: Message[];
  currentUserId: string | null;
  participantNameById: Record<string, string>;
  /**
   * UUID of the AI bot participant for this conversation, derived from
   * ``conversation.participants`` (role === "assistant" or is_system).
   * When a message's ``sender_id`` matches this id we render the AI bubble.
   * Falls back to the legacy display-name heuristic when null (dev fallback).
   */
  aiBotUserId?: string | null;
  isTyping: boolean;
  backgroundUrl?: string | null;
  hasMore?: boolean;
  loadMore?: () => Promise<number>;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onRecall: (msgId: string) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onForward?: (msg: Message) => void;
  onJumpToReply?: (replyId: string) => void;
  onRetry?: (msgId: string) => void;
  onDiscard?: (msgId: string) => void;
}

export interface MessageListHandle {
  jumpToMessage: (msgId: string) => void;
  scrollToBottom: () => void;
  scrollToIndex: (index: number) => void;
}

export function MessageList(props: MessageListProps) {
  return <MessageListContent key={props.conversationId} {...props} />;
}

function MessageListContent(
  {
    ref,
    conversationId,
    messages,
    currentUserId,
    participantNameById,
    aiBotUserId,
    isTyping,
    backgroundUrl,
    hasMore = false,
    loadMore,
    onReply,
    onEdit,
    onRecall,
    onDelete,
    onPin,
    onReact,
    onForward,
    onJumpToReply,
    onRetry,
    onDiscard,
  }: MessageListProps
) {
  const locale = useLocale();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [scrollerElement, setScrollerElement] = useState<HTMLDivElement | null>(null);
  const handleScrollerRef = useCallback((el: HTMLElement | Window | null) => {
    setScrollerElement(el instanceof HTMLDivElement ? el : null);
  }, []);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  const shouldFollowTailRef = useRef(true);
  const [showTimeChip, setShowTimeChip] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [jumpInitialDate, setJumpInitialDate] = useState<Date | null>(null);
  const [topVisibleIndex, setTopVisibleIndex] = useState(0);
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_FIRST_ITEM_INDEX);
  const [pendingJumpTargetIndex, setPendingJumpTargetIndex] = useState<number | null>(null);

  const timeChipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingOlderRef = useRef(false);
  const prevLenForAppendRef = useRef(0);
  const prevLastMsgIdRef = useRef<string | null>(null);
  const prevTailSignatureRef = useRef<string | null>(null);
  const prevIsTypingRef = useRef(isTyping);
  const prevFirstMsgIdRef = useRef<string | undefined>(undefined);
  const prevMessagesLenRef = useRef(0);
  const pendingJumpRequestIdRef = useRef(0);
  const messagesRef = useRef(messages);
  const hasMoreRef = useRef(hasMore);
  const loadMoreRef = useRef(loadMore);
  const lastSeenMessageCountRef = useRef(messages.length);

  const topDate =
    messages.length > 0 && topVisibleIndex >= 0 && topVisibleIndex < messages.length
      ? new Date(messages[topVisibleIndex].created_at)
      : messages.length > 0
        ? new Date(messages[0].created_at)
        : null;

  useEffect(() => {
    messagesRef.current = messages;
    hasMoreRef.current = hasMore;
    loadMoreRef.current = loadMore;
  }, [messages, hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  // When older messages are prepended, shift firstItemIndex so scroll position is preserved
  useEffect(() => {
    const head = messages[0]?.id;
    const len = messages.length;
    if (
      prevMessagesLenRef.current > 0 &&
      len > prevMessagesLenRef.current &&
      head !== undefined &&
      head !== prevFirstMsgIdRef.current
    ) {
      const delta = len - prevMessagesLenRef.current;
      setFirstItemIndex((f) => Math.max(1, f - delta));
    }
    prevFirstMsgIdRef.current = head;
    prevMessagesLenRef.current = len;
  }, [messages]);

  // Native scroll: scrolled up → show time chip (parent-owned auto-hide).
  // Also: geometry-based fallback to force "at bottom" when within 64px of end,
  // so the scroll-to-end button hides reliably even if Virtuoso's event lags.
  useEffect(() => {
    const el = scrollerElement;
    if (!el) return;
    let prevScrollTop = el.scrollTop;

    const onScroll = () => {
      const delta = prevScrollTop - el.scrollTop;
      if (delta > 0) {
        shouldFollowTailRef.current = false;
      }
      if (delta > 4) {
        setShowTimeChip(true);
        if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
        timeChipTimerRef.current = setTimeout(() => {
          setShowTimeChip(false);
        }, 3_000);
      }
      prevScrollTop = el.scrollTop;

      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
      if (nearBottom && !atBottomRef.current) {
        atBottomRef.current = true;
        shouldFollowTailRef.current = true;
        lastSeenMessageCountRef.current = messagesRef.current.length;
        setIsAtBottom(true);
        setShowTimeChip(false);
        if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollerElement]);

  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    atBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) {
      shouldFollowTailRef.current = true;
      lastSeenMessageCountRef.current = messagesRef.current.length;
      setShowTimeChip(false);
      if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    } else {
      if (!isTyping) shouldFollowTailRef.current = false;
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = setTimeout(() => {
        // no-op: reserved for future soft-dismiss
      }, 10_000);
    }
  }, [isTyping]);

  const scheduleScrollerBottomSweep = useCallback(
    (behavior: ScrollBehavior) => {
      const sweep = () => {
        const el = scrollerElement;
        if (el && typeof el.scrollTo === "function") {
          el.scrollTo({ top: el.scrollHeight, behavior });
        }
      };

      requestAnimationFrame(() => {
        sweep();
        requestAnimationFrame(sweep);
      });
    },
    [scrollerElement]
  );

  const handleRangeChanged = useCallback(
    (range: ListRange) => {
      // Virtuoso passes absolute indices when `firstItemIndex` is set; map to data indices.
      setTopVisibleIndex(range.startIndex - firstItemIndex);
    },
    [firstItemIndex]
  );

  // Tail changes: auto-scroll when the user is following the bottom.
  // AI replies can grow in place, so content/status changes matter too.
  useEffect(() => {
    const n = messages.length;
    if (n === 0) {
      prevLenForAppendRef.current = 0;
      prevLastMsgIdRef.current = null;
      prevTailSignatureRef.current = null;
      return;
    }
    const last = messages[n - 1];
    const lastId = last?.id ?? null;
    const prevLen = prevLenForAppendRef.current;
    const prevLastId = prevLastMsgIdRef.current;
    const prevTailSignature = prevTailSignatureRef.current;
    const tailSignature = last ? `${last.id}:${last.status}:${last.content.length}` : null;
    const grew = n > prevLen;
    const isNewTail = lastId !== prevLastId;
    const tailUpdated = !grew && lastId === prevLastId && tailSignature !== prevTailSignature;
    prevLenForAppendRef.current = n;
    prevLastMsgIdRef.current = lastId;
    prevTailSignatureRef.current = tailSignature;

    if (!(grew && isNewTail) && !tailUpdated) return;

    const fromSelf = Boolean(currentUserId && last && last.sender_id === currentUserId);
    if (atBottomRef.current || fromSelf || shouldFollowTailRef.current) {
      shouldFollowTailRef.current = true;
      const behavior: ScrollBehavior = fromSelf ? "smooth" : "auto";
      virtuosoRef.current?.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior,
      });
      scheduleScrollerBottomSweep(behavior);
    } else if (grew && isNewTail) {
      return;
    }
  }, [messages, currentUserId, scheduleScrollerBottomSweep]);

  const scrollToTargetIndex = useCallback(
    (dataIndex: number) => {
      const targetIndex = firstItemIndex + dataIndex;
      virtuosoRef.current?.scrollToIndex({
        index: targetIndex,
        align: "start",
        behavior: "auto",
      });
      setTopVisibleIndex(dataIndex);
      setShowTimeChip(false);
      const jumpingToBottom = dataIndex >= messages.length - 1;
      atBottomRef.current = jumpingToBottom;
      shouldFollowTailRef.current = jumpingToBottom;
      setIsAtBottom(jumpingToBottom);
      if (jumpingToBottom) {
        lastSeenMessageCountRef.current = messagesRef.current.length;
      }
    },
    [firstItemIndex, messages.length]
  );

  const scrollToBottomImpl = useCallback(() => {
    // Two-step scroll: jump to LAST item anchor, then sweep the scroller
    // to its true bottom so Virtuoso's Footer spacing is covered.
    virtuosoRef.current?.scrollToIndex({
      index: "LAST",
      align: "end",
      behavior: "auto",
    });
    scheduleScrollerBottomSweep("smooth");
    atBottomRef.current = true;
    shouldFollowTailRef.current = true;
    lastSeenMessageCountRef.current = messagesRef.current.length;
    setIsAtBottom(true);
    setShowTimeChip(false);
    if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
  }, [scheduleScrollerBottomSweep]);

  useEffect(() => {
    const wasTyping = prevIsTypingRef.current;
    prevIsTypingRef.current = isTyping;
    const shouldFollowTyping = atBottomRef.current || shouldFollowTailRef.current;
    if (!isTyping || wasTyping || !shouldFollowTyping) return;

    const frame = requestAnimationFrame(() => {
      if (atBottomRef.current || shouldFollowTailRef.current) scrollToBottomImpl();
    });
    return () => cancelAnimationFrame(frame);
  }, [isTyping, scrollToBottomImpl]);

  useImperativeHandle(
    ref,
    () => ({
      jumpToMessage(msgId: string) {
        const dataIndex = messages.findIndex((m) => m.id === msgId);
        if (dataIndex >= 0) {
          virtuosoRef.current?.scrollToIndex({
            index: firstItemIndex + dataIndex,
            align: "center",
            behavior: "smooth",
          });
          setHighlightedId(msgId);
        }
      },
      scrollToBottom: scrollToBottomImpl,
      scrollToIndex(index: number) {
        setPendingJumpTargetIndex(index);
      },
    }),
    [messages, firstItemIndex, scrollToBottomImpl]
  );

  const handleTimeChipClick = useCallback(() => {
    if (timeChipTimerRef.current) clearTimeout(timeChipTimerRef.current);
    setShowTimeChip(false);
    setJumpInitialDate(null);
    setShowDatePicker(true);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setJumpInitialDate(date);
    setShowDatePicker(true);
  }, []);

  const handleJumpToDate = useCallback(async (date: Date) => {
    const requestId = pendingJumpRequestIdRef.current + 1;
    pendingJumpRequestIdRef.current = requestId;
    const targetDateKey = getDateKey(date);

    let targetIndex = findFirstIndexForDate(messagesRef.current, targetDateKey);
    let attempts = 0;

    while (
      targetIndex === undefined &&
      hasMoreRef.current &&
      loadMoreRef.current &&
      attempts < MAX_DATE_JUMP_LOADS
    ) {
      attempts += 1;
      if (pendingJumpRequestIdRef.current !== requestId) return false;
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Date jump must load pages sequentially until the target date exists.
      const loadedCount = await loadMoreRef.current();
      if (loadedCount === 0) break;
      if (pendingJumpRequestIdRef.current !== requestId) return false;
      targetIndex = findFirstIndexForDate(messagesRef.current, targetDateKey);
    }

    if (pendingJumpRequestIdRef.current !== requestId || targetIndex === undefined) {
      return false;
    }

    setPendingJumpTargetIndex(targetIndex);
    return true;
  }, []);

  useEffect(() => {
    if (pendingJumpTargetIndex === null) return;
    if (pendingJumpTargetIndex < 0 || pendingJumpTargetIndex >= messages.length) return;

    const rafId = requestAnimationFrame(() => {
      scrollToTargetIndex(pendingJumpTargetIndex);
      requestAnimationFrame(() => {
        scrollToTargetIndex(pendingJumpTargetIndex);
        setPendingJumpTargetIndex(null);
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [messages.length, pendingJumpTargetIndex, scrollToTargetIndex]);

  const itemContent = useCallback(
    (index: number) => {
      const dataIndex = index - firstItemIndex;
      const msg = messages[dataIndex];
      if (!msg) return null;
      const isOwn = !!currentUserId && msg.sender_id === currentUserId;
      // Authoritative AI detection — prefer the explicit `sender_kind` field
      // sent by the BE (single source of truth, no spoofing). Fall back to a
      // UUID match against the bot participant when the BE hasn't been
      // updated yet, and to the legacy `"ai"` sentinel only for the dev
      // FALLBACK_AI_CONVERSATION (no real participants list).
      const isAi =
        msg.sender_kind === "ai" ||
        (aiBotUserId ? msg.sender_id === aiBotUserId : msg.sender_id === "ai");
      const prev = messages[dataIndex - 1];
      const next = messages[dataIndex + 1];

      const groupPosition = getGroupPosition(
        prev ? { sender_id: prev.sender_id, created_at: prev.created_at } : null,
        { sender_id: msg.sender_id, created_at: msg.created_at },
        next ? { sender_id: next.sender_id, created_at: next.created_at } : null
      );

      const showAvatar = groupPosition === "solo" || groupPosition === "first";

      let dateSep: string | undefined;
      if (!prev) {
        dateSep = formatDateSeparator(msg.created_at, locale);
      } else {
        const prevDate = new Date(prev.created_at);
        const curDate = new Date(msg.created_at);
        if (
          prevDate.getFullYear() !== curDate.getFullYear() ||
          prevDate.getMonth() !== curDate.getMonth() ||
          prevDate.getDate() !== curDate.getDate()
        ) {
          dateSep = formatDateSeparator(msg.created_at, locale);
        }
      }

      const showTime =
        isAi ||
        (!isAi && msg.is_edited) ||
        shouldShowTimestamp(
          prev ? { sender_id: prev.sender_id, created_at: prev.created_at } : null,
          next ? { sender_id: next.sender_id, created_at: next.created_at } : null,
          msg.sender_id,
          msg.created_at
        );

      return (
        <li
          id={`msg-${msg.id}`}
          className={msg.id === highlightedId ? "animate-msg-highlight rounded-xl" : undefined}
          onAnimationEnd={() => {
            if (msg.id === highlightedId) setHighlightedId(null);
          }}
        >
          <MessageBubble
            message={msg}
            isOwn={isOwn}
            isAi={isAi}
            currentUserId={currentUserId}
            participantNameById={participantNameById}
            showAvatar={showAvatar}
            showDateSeparator={dateSep}
            groupPosition={groupPosition}
            bubbleRadius={getBubbleRadius(groupPosition, isOwn)}
            showTime={showTime}
            onReply={onReply}
            onEdit={onEdit}
            onRecall={onRecall}
            onDelete={onDelete}
            onPin={onPin}
            onReact={onReact}
            onForward={onForward}
            onJumpToReply={onJumpToReply}
            onDateClick={handleDateClick}
            onRetry={onRetry}
            onDiscard={onDiscard}
          />
        </li>
      );
    },
    [
      messages,
      firstItemIndex,
      locale,
      currentUserId,
      participantNameById,
      highlightedId,
      onReply,
      onEdit,
      onRecall,
      onDelete,
      onPin,
      onReact,
      onForward,
      onJumpToReply,
      onRetry,
      onDiscard,
      handleDateClick,
      aiBotUserId,
    ]
  );

  const Footer = useCallback(() => {
    return (
      <div
        className="px-4 flex items-end"
        style={{ minHeight: isTyping ? undefined : 8 }}
        aria-hidden={!isTyping}
      >
        {isTyping ? <TypingIndicator /> : <div className="h-2 w-full shrink-0" />}
      </div>
    );
  }, [isTyping]);

  const startReached = useCallback(async () => {
    if (!hasMore || !loadMore || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    try {
      await loadMore();
    } finally {
      loadingOlderRef.current = false;
    }
  }, [hasMore, loadMore]);

  const showScrollBtn = !isAtBottom;
  const newWhileScrolledCount = isAtBottom
    ? 0
    : Math.max(0, messages.length - lastSeenMessageCountRef.current);

  return (
    <>
      <div
        className="flex-1 overflow-hidden relative"
        style={
          backgroundUrl
            ? {
                backgroundImage: `url(${backgroundUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {backgroundUrl && (
          <div className="absolute inset-0 bg-background/40 dark:bg-background/60 pointer-events-none" />
        )}

        <div className="absolute inset-0 z-10">
          <Virtuoso
            key={conversationId}
            ref={virtuosoRef}
            scrollerRef={handleScrollerRef}
            role="log"
            aria-live="polite"
            aria-label="Messages"
            style={{ height: "100%" }}
            totalCount={messages.length}
            firstItemIndex={firstItemIndex}
            itemContent={itemContent}
            computeItemKey={(index) => {
              const msg = messages[index - firstItemIndex];
              // Include Virtuoso row index so keys stay unique if the same message id
              // appears twice (e.g. overlapping pagination).
              return msg ? `${index}:${msg.id}` : `idx-${index}`;
            }}
            followOutput={false}
            {...(messages.length > 0
              ? { initialTopMostItemIndex: { index: "LAST" as const, align: "end" as const } }
              : {})}
            increaseViewportBy={{ top: 300, bottom: 300 }}
            components={{ Footer, List: ChatVirtuosoList }}
            atBottomThreshold={64}
            atBottomStateChange={handleAtBottomChange}
            rangeChanged={handleRangeChanged}
            startReached={hasMore && loadMore ? startReached : undefined}
          />
        </div>

        <ScrollTimeChip visible={showTimeChip} date={topDate} onClick={handleTimeChipClick} />

        <ScrollToEndButton
          visible={showScrollBtn}
          pendingCount={newWhileScrolledCount}
          onClick={() => {
            lastSeenMessageCountRef.current = messagesRef.current.length;
            scrollToBottomImpl();
          }}
        />
      </div>

      <DateJumpSheet
        open={showDatePicker}
        onOpenChange={(open) => {
          setShowDatePicker(open);
          if (!open) setJumpInitialDate(null);
        }}
        messages={messages}
        onJumpToDate={handleJumpToDate}
        onJumpToLatest={scrollToBottomImpl}
        initialMonth={jumpInitialDate ?? topDate}
      />
    </>
  );
}
