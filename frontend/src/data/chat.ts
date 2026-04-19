import type { ChatGradient, ChatPattern } from "@/types/api";

export const CHAT_GRADIENTS: ChatGradient[] = [
  { id: "none", name: "Không có màu", css: "", type: "light" },
  {
    id: "grad-default-light",
    name: "Mặc định sáng",
    css: "linear-gradient(160deg, #e8f4fd 0%, #dff3e8 50%, #e0eaff 100%)",
    type: "light",
  },
  {
    id: "grad-default-dark",
    name: "Mặc định tối",
    css: "linear-gradient(160deg, #141e30 0%, #1a2a4a 50%, #243b55 100%)",
    type: "dark",
  },
  {
    id: "grad-spring",
    name: "Mùa xuân",
    css: "linear-gradient(160deg, #f8d7ea 0%, #d4f1dc 50%, #fce4f0 100%)",
    type: "light",
  },
  {
    id: "grad-summer",
    name: "Mùa hè",
    css: "linear-gradient(160deg, #ffeaa7 0%, #fdcb6e 40%, #ff7675 100%)",
    type: "light",
  },
  {
    id: "grad-polar-lights",
    name: "Cực quang",
    css: "linear-gradient(160deg, #0d324d 0%, #1abc9c 50%, #7f5a83 100%)",
    type: "dark",
  },
  {
    id: "grad-deep-ocean",
    name: "Đại dương sâu",
    css: "linear-gradient(160deg, #0a1628 0%, #0c2e4a 50%, #0d4f6b 100%)",
    type: "dark",
  },
  {
    id: "grad-night-forest",
    name: "Rừng đêm",
    css: "linear-gradient(160deg, #0a1f0e 0%, #133a1c 50%, #1a4a2a 100%)",
    type: "dark",
  },
  {
    id: "grad-galaxy",
    name: "Thiên hà",
    css: "linear-gradient(160deg, #0f0c29 0%, #1a1145 50%, #302b63 100%)",
    type: "dark",
  },
  {
    id: "grad-sunset-dark",
    name: "Hoàng hôn",
    css: "linear-gradient(160deg, #1a0a0f 0%, #2d1421 50%, #3d1c32 100%)",
    type: "dark",
  },
  {
    id: "grad-cherry-blossom",
    name: "Hoa anh đào",
    css: "linear-gradient(160deg, #fde2e4 0%, #fad2e1 50%, #f8e8ee 100%)",
    type: "light",
  },
  {
    id: "grad-sky",
    name: "Bầu trời",
    css: "linear-gradient(160deg, #e3f2fd 0%, #b3e5fc 50%, #e1f5fe 100%)",
    type: "light",
  },
  {
    id: "grad-lavender",
    name: "Oải hương",
    css: "linear-gradient(160deg, #ede7f6 0%, #e1d5f0 50%, #f3e5f5 100%)",
    type: "light",
  },
  {
    id: "grad-mint",
    name: "Bạc hà",
    css: "linear-gradient(160deg, #e0f2f1 0%, #c8e6c9 50%, #e8f5e9 100%)",
    type: "light",
  },
  {
    id: "grad-nebula",
    name: "Tinh vân",
    css: "linear-gradient(160deg, #0b0e2a 0%, #1b1464 25%, #2d1b69 50%, #0f4c75 75%, #0b0e2a 100%)",
    type: "dark",
  },
  {
    id: "grad-volcanic",
    name: "Núi lửa",
    css: "linear-gradient(160deg, #1a0000 0%, #3d0c02 25%, #5c1a0a 50%, #2a0a04 75%, #1a0000 100%)",
    type: "dark",
  },
  {
    id: "grad-arctic",
    name: "Bắc cực",
    css: "linear-gradient(160deg, #0a1929 0%, #0d2137 25%, #1a3a5c 50%, #0f2b4a 75%, #0a1929 100%)",
    type: "dark",
  },
  {
    id: "grad-midnight-rose",
    name: "Hồng đêm",
    css: "linear-gradient(160deg, #1a0a1a 0%, #2d1230 25%, #4a1942 50%, #2a1028 75%, #1a0a1a 100%)",
    type: "dark",
  },
  {
    id: "grad-peach",
    name: "Đào",
    css: "linear-gradient(160deg, #fff5ee 0%, #ffdab9 25%, #ffc4a3 50%, #ffe8d6 75%, #fff5ee 100%)",
    type: "light",
  },
  {
    id: "grad-cotton-candy",
    name: "Kẹo bông",
    css: "linear-gradient(160deg, #fce4ec 0%, #f3e5f5 25%, #e8eaf6 50%, #fce4ec 75%, #f8e8f0 100%)",
    type: "light",
  },
  {
    id: "grad-morning-dew",
    name: "Sương mai",
    css: "linear-gradient(160deg, #e8f5e9 0%, #e0f7fa 25%, #e3f2fd 50%, #e8f5e9 75%, #e0f2f1 100%)",
    type: "light",
  },
  {
    id: "grad-golden-hour",
    name: "Giờ vàng",
    css: "linear-gradient(160deg, #fff8e1 0%, #ffecb3 25%, #ffe0b2 50%, #fff3e0 75%, #fff8e1 100%)",
    type: "light",
  },
];

export const CHAT_PATTERNS: ChatPattern[] = [
  { id: "none", name: "Không có họa tiết", filename: "", hasLight: true },
  { id: "pat-cats", name: "Mèo", filename: "Theme_Cats.svg", hasLight: true },
  { id: "pat-space", name: "Vũ trụ", filename: "Theme_Space.svg", hasLight: true },
  { id: "pat-food", name: "Món ăn", filename: "Theme_Food.svg", hasLight: true },
  { id: "pat-sport", name: "Thể thao", filename: "Theme_Sport.svg", hasLight: true },
  { id: "pat-love", name: "Tình yêu", filename: "Theme_Love.svg", hasLight: true },
];

export function resolvePatternUrl(
  pattern: Pick<ChatPattern, "filename" | "hasLight">,
  gradientType: "light" | "dark"
): string {
  if (!pattern.filename) return "";
  const variant = gradientType === "light" && pattern.hasLight ? "light" : "dark";
  return `/resources/chat/patterns/${variant}/${encodeURIComponent(pattern.filename)}`;
}

export function parseThemeId(themeId: string | null): {
  gradId: string;
  patId: string;
  opacity: number;
} {
  const defaults = { gradId: "none", patId: "none", opacity: 45 };
  if (!themeId) return defaults;
  const parts = themeId.split("|");
  if (parts.length < 2) return defaults;
  const rawOpacity = parts[2] ? parseInt(parts[2], 10) : 45;
  const opacity = Number.isFinite(rawOpacity) ? Math.min(100, Math.max(0, rawOpacity)) : 45;
  return { gradId: parts[0] || "none", patId: parts[1] || "none", opacity };
}

export function buildThemeId(gradId: string, patId: string, opacity = 45): string | null {
  if (gradId === "none" && patId === "none") return null;
  return `${gradId}|${patId}|${opacity}`;
}

// TWallpaper animated gradient color palettes keyed by gradient id.
// Max 4 hex colors per entry (TWallpaper constraint).
// Gradients not listed here fall back to the static CSS gradient in ChatBackground.
export const TWALLPAPER_COLORS: Record<string, { colors: string[]; tails?: number }> = {
  "grad-default-dark": {
    // Deep near-black / charcoal / slate with restrained teal-cyan highlight
    colors: ["#0e1117", "#1a1f2b", "#1e2d3d", "#143038"],
    tails: 90,
  },
  "grad-polar-lights": {
    // Aurora: deep navy → teal-cyan → muted purple
    colors: ["#0d1f2e", "#0f3b3b", "#1abc9c", "#4a3060"],
    tails: 80,
  },
  "grad-default-light": {
    // Soft off-white / mist / pale blue-teal — medical-grade freshness
    colors: ["#f0f7fb", "#e4f2ea", "#eaf0ff", "#dff5f0"],
    tails: 90,
  },
  "grad-spring": {
    // Pastel pink / soft green — spring freshness
    colors: ["#fce8f2", "#e5f5e0", "#f8e9f4", "#fdf0f6"],
    tails: 85,
  },
  "grad-summer": {
    // Warm yellow / peach / coral
    colors: ["#fff4d1", "#fde6a0", "#ffc9c8", "#ffe3aa"],
    tails: 85,
  },
  "grad-deep-ocean": {
    colors: ["#0a1628", "#0c2e4a", "#0d4f6b", "#0a3550"],
    tails: 90,
  },
  "grad-night-forest": {
    colors: ["#0a1f0e", "#133a1c", "#1a4a2a", "#0f2e16"],
    tails: 85,
  },
  "grad-galaxy": {
    colors: ["#0f0c29", "#1a1145", "#302b63", "#24243e"],
    tails: 80,
  },
  "grad-sunset-dark": {
    colors: ["#1a0a0f", "#2d1421", "#3d1c32", "#1f1028"],
    tails: 80,
  },
  "grad-cherry-blossom": {
    colors: ["#fde2e4", "#fad2e1", "#f8e8ee", "#fce4ec"],
    tails: 85,
  },
  "grad-sky": {
    colors: ["#e3f2fd", "#b3e5fc", "#e1f5fe", "#dceefb"],
    tails: 90,
  },
  "grad-lavender": {
    colors: ["#ede7f6", "#e1d5f0", "#f3e5f5", "#e8daf0"],
    tails: 85,
  },
  "grad-mint": {
    colors: ["#e0f2f1", "#c8e6c9", "#e8f5e9", "#d4edda"],
    tails: 90,
  },
  "grad-nebula": {
    colors: ["#0b0e2a", "#1b1464", "#2d1b69", "#0f4c75"],
    tails: 80,
  },
  "grad-volcanic": {
    colors: ["#1a0000", "#3d0c02", "#5c1a0a", "#2a0a04"],
    tails: 80,
  },
  "grad-arctic": {
    colors: ["#0a1929", "#0d2137", "#1a3a5c", "#0f2b4a"],
    tails: 90,
  },
  "grad-midnight-rose": {
    colors: ["#1a0a1a", "#2d1230", "#4a1942", "#2a1028"],
    tails: 80,
  },
  "grad-peach": {
    colors: ["#fff5ee", "#ffdab9", "#ffc4a3", "#ffe8d6"],
    tails: 85,
  },
  "grad-cotton-candy": {
    colors: ["#fce4ec", "#f3e5f5", "#e8eaf6", "#f8e8f0"],
    tails: 85,
  },
  "grad-morning-dew": {
    colors: ["#e8f5e9", "#e0f7fa", "#e3f2fd", "#e0f2f1"],
    tails: 90,
  },
  "grad-golden-hour": {
    colors: ["#fff8e1", "#ffecb3", "#ffe0b2", "#fff3e0"],
    tails: 85,
  },
};

export const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/**
 * Translation keys (under `chat.ai.*`) for AI quick-reply suggestions.
 * Prompts are intentionally educational, NOT diagnostic — see plan §B2.
 * Resolved by {@link AiQuickReplies} via `useTranslations("chat.ai")`.
 */
export const AI_QUICK_REPLY_KEYS = [
  "quickReply1",
  "quickReply2",
  "quickReply3",
  "quickReply4",
  "quickReply5",
] as const;
