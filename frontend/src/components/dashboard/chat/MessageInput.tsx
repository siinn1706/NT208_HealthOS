"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import { Send, Smile, Paperclip, X, Image as ImageIcon, FileText } from "lucide-react";
import { MessageReplyPreview } from "./MessageReplyPreview";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types/api";

// Lazy load emoji picker to reduce initial bundle
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default ?? m),
  { ssr: false, loading: () => <div className="w-[352px] h-[435px] bg-background animate-pulse rounded-lg" /> }
);
// @emoji-mart/data is imported asynchronously inside the picker itself

interface MessageInputProps {
  replyTo?: Pick<Message, "id" | "content" | "sender_id" | "type"> | null;
  editingMessage?: Message | null;
  onSend: (content: string) => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onKeyPress?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  replyTo,
  editingMessage,
  onSend,
  onCancelReply,
  onCancelEdit,
  onKeyPress,
  disabled,
}: MessageInputProps) {
  const t = useTranslations("chat");
  const [value, setValue] = useState(editingMessage?.content ?? "");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiData, setEmojiData] = useState<Record<string, unknown> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lazy-load emoji data when picker is first opened
  useEffect(() => {
    if (emojiOpen && !emojiData) {
      import("@emoji-mart/data").then((mod) => setEmojiData(mod.default ?? mod));
    }
  }, [emojiOpen, emojiData]);

  // Sync value when editingMessage changes
  const prevEditRef = useRef<string | undefined>(editingMessage?.id);
  if (prevEditRef.current !== editingMessage?.id) {
    prevEditRef.current = editingMessage?.id;
    // Synchronously pre-fill textarea with the message content being edited
    setValue(editingMessage?.content ?? "");
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    onKeyPress?.();
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function insertEmoji(emojiObj: any) {
    const emoji = emojiObj?.native ?? emojiObj;
    setValue((prev) => prev + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm">
      {/* Reply / Edit indicator */}
      {replyTo && (
        <div className="px-4 pt-2">
          <MessageReplyPreview replyTo={replyTo} onCancel={onCancelReply} />
        </div>
      )}
      {editingMessage && (
        <div className="flex items-center justify-between px-4 pt-2 text-xs text-primary">
          <span className="font-medium">{t("editingMessage")}</span>
          <button
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Attachment popover */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label={t("attachFile")}
              disabled={disabled}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-44 p-1" sideOffset={8}>
            <button
              onClick={() => { toast.info(t("uploadComingSoon")); setAttachOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              {t("attachImage")}
            </button>
            <Separator className="my-1" />
            <button
              onClick={() => { toast.info(t("uploadComingSoon")); setAttachOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              {t("attachFile")}
            </button>
          </PopoverContent>
        </Popover>

        {/* Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            rows={1}
            disabled={disabled}
            className={cn(
              "resize-none min-h-[40px] max-h-[120px] rounded-2xl bg-secondary border-secondary",
              "focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background",
              "text-sm pr-4 py-2.5 transition-[background-color,border-color,box-shadow] duration-150 ease-out",
              editingMessage && "border-primary/50 bg-primary/5"
            )}
            aria-label={t("typeMessage")}
          />
        </div>

        {/* Full emoji picker */}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              aria-label="Emoji"
              disabled={disabled}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40"
            >
              <Smile className="w-4 h-4" />
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
                locale="vi"
              />
            )}
          </PopoverContent>
        </Popover>

        {/* Send button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label={t("send")}
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-full transition-[background-color,color,opacity] duration-150 ease-out",
            editingMessage && "bg-amber-500 hover:bg-amber-600"
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
