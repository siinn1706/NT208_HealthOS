import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiChatBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AiChatBadge({ size = "md", className }: AiChatBadgeProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };
  const iconMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      aria-label="HealthOS AI"
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0",
        "bg-gradient-to-br from-[#1965B3] to-[#41BCE6]",
        sizeMap[size],
        className
      )}
    >
      <Bot className={cn("text-white", iconMap[size])} />
    </div>
  );
}
