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

export const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const AI_QUICK_REPLIES = [
  "Huyết áp của tôi có bình thường không?",
  "Gợi ý chế độ ăn lành mạnh",
  "Tôi nên tập bài tập gì?",
  "Giải thích chỉ số BMI",
  "Nhắc nhở uống thuốc",
] as const;
