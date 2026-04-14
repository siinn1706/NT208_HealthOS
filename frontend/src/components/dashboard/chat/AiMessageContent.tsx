"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

// Stable plugin arrays — avoids ReactMarkdown re-parsing on every parent render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REMARK_PLUGINS: any[] = [remarkGfm];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REHYPE_PLUGINS: any[] = [rehypeSanitize];

interface AiMessageContentProps {
  content: string;
  className?: string;
}

export const AiMessageContent = memo(function AiMessageContent({ content, className }: AiMessageContentProps) {
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
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>{content}</ReactMarkdown>
    </div>
  );
});
