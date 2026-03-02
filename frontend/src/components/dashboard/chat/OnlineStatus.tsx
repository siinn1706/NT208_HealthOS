import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function OnlineStatus({ isOnline, className, size = "sm" }: OnlineStatusProps) {
  if (!isOnline) return null;
  return (
    <span
      aria-label="Online"
      className={cn(
        "rounded-full bg-green-500 ring-2 ring-background",
        size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5",
        className
      )}
    />
  );
}
