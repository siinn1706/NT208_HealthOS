"use client";

/**
 * useChatDrafts — per-conversation draft preservation in localStorage.
 *
 * Why localStorage and not sessionStorage:
 *   Drafts must survive a hard reload (e.g. user accidentally closes the tab,
 *   or a deploy bumps service-worker scope). They are scoped per conversation
 *   id, so opening a different conversation doesn't accidentally surface a
 *   stale draft. A 30-day TTL keeps localStorage clean without needing a cron.
 *
 * Why a flat namespaced key prefix and not one giant blob:
 *   Per-conversation keys mean writes are O(content-size), not O(all-drafts).
 *   That keeps the hot path (every keystroke) fast even with hundreds of
 *   threads, and makes per-conversation cleanup atomic.
 *
 * Privacy:
 *   Each storage key is namespaced by the authenticated user id via
 *   `userKeySync(userId, "chat-draft", conversationId)` so user-A's drafts
 *   are unreadable by user-B after a logout/login cycle on the same device.
 *
 * Backed by best-effort try/catch — Safari private mode, quota errors, and
 * disabled storage all degrade silently to "no draft persistence" rather than
 * crashing the composer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveAuthUserId, userKeySync } from "@/lib/user-scoped-storage";

const STORAGE_BUCKET = "chat-draft";
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const WRITE_DEBOUNCE_MS = 250;

interface DraftEntry {
  content: string;
  /** ms since epoch — used to evict drafts older than `DRAFT_TTL_MS`. */
  updated_at: number;
}

function makeStorageKey(userId: string | null, conversationId: string): string {
  return userKeySync(userId, STORAGE_BUCKET, conversationId);
}

function readDraft(userId: string | null, conversationId: string | null): string {
  if (!conversationId || typeof window === "undefined") return "";
  const key = makeStorageKey(userId, conversationId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<DraftEntry>;
    if (!parsed || typeof parsed.content !== "string") return "";
    if (typeof parsed.updated_at === "number" && Date.now() - parsed.updated_at > DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return "";
    }
    return parsed.content;
  } catch {
    return "";
  }
}

function writeDraft(userId: string | null, conversationId: string, content: string): void {
  if (typeof window === "undefined") return;
  const key = makeStorageKey(userId, conversationId);
  try {
    if (!content.trim()) {
      window.localStorage.removeItem(key);
      return;
    }
    const entry: DraftEntry = { content, updated_at: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage may be full / disabled (Safari private mode). Silently drop.
  }
}

function clearDraft(userId: string | null, conversationId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(makeStorageKey(userId, conversationId));
  } catch {
    // ignore
  }
}

export interface UseChatDraftsResult {
  /** Latest draft for the current conversation, or "" when none. */
  draft: string;
  /** Update the in-memory draft AND persist (debounced internally). */
  setDraft: (next: string) => void;
  /** Drop the draft (call after a successful send). */
  clear: () => void;
}

export function useChatDrafts(conversationId: string | null): UseChatDraftsResult {
  const [draft, setDraftState] = useState<string>("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef(conversationId);
  // Resolved on mount; until populated we hold off on writes so we never
  // persist under the wrong user id (cross-user PHI leak guard).
  const userIdRef = useRef<string | null>(null);
  const [userIdReady, setUserIdReady] = useState(false);

  // One-time per session: resolve the BFF session user id.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    void resolveAuthUserId().then((uid) => {
      if (cancelled) return;
      userIdRef.current = uid;
      setUserIdReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate draft when conversation OR user id becomes available.
  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (!userIdReady) return;
    setDraftState(readDraft(userIdRef.current, conversationId));
  }, [conversationId, userIdReady]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const setDraft = useCallback((next: string) => {
    setDraftState(next);
    const id = conversationIdRef.current;
    if (!id) return;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    // Debounce so we don't write to localStorage on every keystroke.
    flushTimerRef.current = setTimeout(
      () => writeDraft(userIdRef.current, id, next),
      WRITE_DEBOUNCE_MS,
    );
  }, []);

  const clear = useCallback(() => {
    setDraftState("");
    const id = conversationIdRef.current;
    if (!id) return;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    clearDraft(userIdRef.current, id);
  }, []);

  return { draft, setDraft, clear };
}
