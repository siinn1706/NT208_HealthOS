"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface AiMessageContentProps {
  content: string;
  className?: string;
}

export function AiMessageContent({ content, className }: AiMessageContentProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-headings:my-2 prose-headings:font-semibold",
        "prose-code:text-xs prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-secondary prose-pre:text-sm",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
        "prose-strong:text-foreground",
        // Correct text colors for primary (AI) bubble
        "text-foreground [&_*]:text-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
