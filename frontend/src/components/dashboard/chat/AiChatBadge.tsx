import { cn } from "@/lib/utils";
import { BrandMarkIcon, brandMarkGlassBadgeSurfaceClassName } from "@/components/shared/auth/primitives";

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
} as const;

const LOGO_MAP = {
  sm: "w-6 h-6",
  md: "w-7 h-7",
  lg: "w-9 h-9",
} as const;

interface AiChatBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AiChatBadge({ size = "md", className }: AiChatBadgeProps) {

  return (
    <div
      aria-label="HealthOS AI"
      className={cn(
        "flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full",
        brandMarkGlassBadgeSurfaceClassName,
        SIZE_MAP[size],
        className,
      )}
    >
      <BrandMarkIcon className={LOGO_MAP[size]} />
    </div>
  );
}
