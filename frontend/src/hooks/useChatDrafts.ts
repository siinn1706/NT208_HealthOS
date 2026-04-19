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
 * Backed by best-effort try/catch — Safari private mode, quota errors, and
 * disabled storage all degrade silently to "no draft persistence" rather than
 * crashing the composer.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_KEY_PREFIX = "healthos:chat-draft:v1:";
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface DraftEntry {
  content: string;
  /** ms since epoch — used to evict drafts older than `DRAFT_TTL_MS`. */
  updated_at: number;
}

function storageKey(conversationId: string): string {
  return `${DRAFT_KEY_PREFIX}${conversationId}`;
}

function readDraft(conversationId: string | null): string {
  if (!conversationId || typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(storageKey(conversationId));
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<DraftEntry>;
    if (!parsed || typeof parsed.content !== "string") return "";
    if (typeof parsed.updated_at === "number" && Date.now() - parsed.updated_at > DRAFT_TTL_MS) {
      window.localStorage.removeItem(storageKey(conversationId));
      return "";
    }
    return parsed.content;
  } catch {
    return "";
  }
}

function writeDraft(conversationId: string, content: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!content.trim()) {
      window.localStorage.removeItem(storageKey(conversationId));
      return;
    }
    const entry: DraftEntry = { content, updated_at: Date.now() };
    window.localStorage.setItem(storageKey(conversationId), JSON.stringify(entry));
  } catch {
    // Storage may be full / disabled (Safari private mode). Silently drop.
  }
}

function clearDraft(conversationId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(conversationId));
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
  const [draft, setDraftState] = useState<string>(() => readDraft(conversationId));
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationIdRef = useRef(conversationId);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    conversationIdRef.current = conversationId;
    setDraftState(readDraft(conversationId));
  }, [conversationId]);
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
    flushTimerRef.current = setTimeout(() => writeDraft(id, next), 250);
  }, []);

  const clear = useCallback(() => {
    setDraftState("");
    const id = conversationIdRef.current;
    if (!id) return;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    clearDraft(id);
  }, []);

  return { draft, setDraft, clear };
}
