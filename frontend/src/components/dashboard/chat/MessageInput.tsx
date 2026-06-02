"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations, useLocale } from "next-intl";
import { Send, Smile, Paperclip, X, Image as ImageIcon, FileText, Pencil, Loader2 } from "lucide-react";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import type { Message } from "@/types/api";
import { useChatDrafts } from "@/hooks/useChatDrafts";

const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

// Lazy load emoji picker to reduce initial bundle
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default ?? m),
  { ssr: false, loading: () => <div className="w-[352px] h-[435px] bg-background animate-pulse rounded-lg" /> }
);
// @emoji-mart/data is imported asynchronously inside the picker itself

interface MessageInputProps {
  /**
   * Active conversation id — required so the composer can persist a per-thread
   * draft across navigation, page reloads, and accidental tab closes.
   */
  conversationId: string | null;
  replyTo?: Pick<Message, "id" | "content" | "sender_id" | "sender_kind" | "sender_display_name" | "type"> | null;
  currentUserId: string | null;
  editingMessage?: Message | null;
  onSend: (content: string) => void;
  onSendImage?: (file: File, caption: string) => Promise<void>;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onKeyPress?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  replyTo,
  currentUserId,
  editingMessage,
  onSend,
  onSendImage,
  onCancelReply,
  onCancelEdit,
  onKeyPress,
  disabled,
}: MessageInputProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { draft, setDraft, clear: clearDraft } = useChatDrafts(conversationId);
  const [value, setValue] = useState<string>(() => editingMessage?.content ?? draft);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [emojiData, setEmojiData] = useState<Record<string, unknown> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lazy-load emoji data when picker is first opened
  useEffect(() => {
    if (emojiOpen && !emojiData) {
      import("@emoji-mart/data").then((mod) => setEmojiData(mod.default ?? mod));
    }
  }, [emojiOpen, emojiData]);

  // Sync value when the active edit target or conversation changes; reset
  // textarea height. When NOT editing, the composer is restored from the
  // per-conversation draft so a user can switch threads (or hard-reload) and
  // continue typing where they left off.
  /* eslint-disable react-hooks/exhaustive-deps -- only reset on edit/conversation target change, not draft poll */
  useEffect(() => {
    setValue(editingMessage?.content ?? draft);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [editingMessage?.id, conversationId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Auto-focus textarea when reply or edit is activated
  useEffect(() => {
    if (replyTo || editingMessage) {
      textareaRef.current?.focus();
    }
  }, [replyTo, editingMessage]);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || imageUploading) return;
    onSend(trimmed);
    setValue("");
    // Edits don't have a draft (they're a separate, transient text path), so
    // only nuke the persisted draft when we actually sent a *new* message.
    if (!editingMessage) clearDraft();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (!onSendImage) {
      toast.info(t("uploadComingSoon"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("imageUploadBadType"));
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      toast.error(t("imageUploadTooLarge", { maxMb: 5 }));
      return;
    }
    setImageUploading(true);
    try {
      await onSendImage(file, value.trim());
      setValue("");
      if (!editingMessage) clearDraft();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("imageUploadFailed"));
    } finally {
      setImageUploading(false);
    }
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setValue(next);
    if (!editingMessage) setDraft(next);
    onKeyPress?.();
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 144) + "px";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function insertEmoji(emojiObj: any) {
    const emoji = emojiObj?.native ?? emojiObj;
    setValue((prev) => {
      const next = prev + emoji;
      if (!editingMessage) setDraft(next);
      return next;
    });
    setEmojiOpen(false);
    textareaRef.current?.focus();
  }

  const hasReplyOrEdit = !!replyTo || !!editingMessage;

  return (
    // `pb-[env(safe-area-inset-bottom)]` keeps the composer flush above the
    // iOS home indicator without leaving a visible gap when the on-screen
    // keyboard is closed. `sticky bottom-0` pins it inside the chat scroll
    // container on mobile so the input is always reachable.
    <LazyMotion features={domAnimation}>
      <div
        className="sticky bottom-0 z-10 border-t border-border bg-background/80 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
      {/* Animated reply / edit indicator */}
      <AnimatePresence>
        {hasReplyOrEdit && (
          <m.div
            className="overflow-hidden px-4 pt-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {editingMessage ? (
              /* Edit bar — amber accent, pencil icon */
              <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-amber-500/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Pencil className="size-3.5 flex-shrink-0 text-amber-500" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {t("editingMessage")}
                  </span>
                </div>
                <button type="button"
                  onClick={onCancelEdit}
                  aria-label={t("cancelEdit")}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : replyTo ? (
              /* Reply bar — blue accent, reply icon */
              <MessageReplyPreview
                replyTo={replyTo}
                currentUserId={currentUserId}
                onCancel={onCancelReply}
                mode="input"
              />
            ) : null}
          </m.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_IMAGE_ACCEPT}
          className="hidden"
          onChange={handleImageSelected}
          aria-hidden="true"
          tabIndex={-1}
        />
        {/* Attachment popover */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <button type="button"
              aria-label={t("attachFile")}
              disabled={disabled || imageUploading || Boolean(editingMessage)}
              className="flex-shrink-0 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40"
            >
              <Paperclip className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-44 p-1" sideOffset={8}>
            <button type="button"
              onClick={() => {
                setAttachOpen(false);
                fileInputRef.current?.click();
              }}
              disabled={imageUploading}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors cursor-pointer"
            >
              {imageUploading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
              {t("attachImage")}
            </button>
            <Separator className="my-1" />
            <button type="button"
              onClick={() => { toast.info(t("uploadComingSoon")); setAttachOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors cursor-pointer"
            >
              <FileText className="size-4 text-muted-foreground" />
              {t("attachFile")}
            </button>
          </PopoverContent>
        </Popover>

        {/* Textarea — no border, bg transition on focus */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            rows={1}
            disabled={disabled}
            className={cn(
              "resize-none min-h-[40px] max-h-[144px] rounded-2xl border-0",
              "bg-secondary/80 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary",
              "text-sm pr-4 py-2.5 transition-[background-color,ring] duration-150 ease-out",
              "overflow-wrap-anywhere break-words max-w-full",
              editingMessage && "bg-primary/5 ring-1 ring-primary/50"
            )}
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            aria-label={t("typeMessage")}
          />
        </div>

        {/* Full emoji picker */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button type="button"
              aria-label="Emoji"
              disabled={disabled}
              className="flex-shrink-0 size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40"
            >
              <Smile className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-0 border-0 shadow-xl" sideOffset={8}>
            {emojiData && (
              <EmojiPicker
                data={emojiData}
                onEmojiSelect={insertEmoji}
                theme="auto"
                previewPosition="none"
                skinTonePosition="none"
                locale={locale}
              />
            )}
          </PopoverContent>
        </Popover>

        {/* Send button — disabled state + press animation */}
        <m.button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || disabled || imageUploading}
          aria-label={t("send")}
          whileTap={!disabled ? { scale: 0.85 } : {}}
          transition={{ duration: 0.1 }}
          className={cn(
            "flex-shrink-0 size-9 rounded-full flex items-center justify-center",
            "transition-all duration-150 ease-out cursor-pointer",
            value.trim() && !imageUploading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-secondary text-muted-foreground/40 pointer-events-none",
            editingMessage && "bg-amber-500 hover:bg-amber-600 text-white"
          )}
        >
          <Send className="size-4" />
        </m.button>
      </div>
      </div>
    </LazyMotion>
  );
}
