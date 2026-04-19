import { Stat } from "@/types";

/**
 * Marketing stats. Values are intentionally soft / qualitative until each
 * claim has a citable source (UX plan §B2 — "Trust-critical health framing").
 *
 * Replace with hard numbers ONLY when:
 *   - the metric is sourced from a measured analytics surface, AND
 *   - we can link to the source from a press kit / about page.
 */
export const stats: Stat[] = [
  {
    id: "users",
    value: "Growing",
    label: {
      vi: "Cộng đồng người dùng đang phát triển",
      en: "Growing community of active users",
    },
  },
  {
    id: "partners",
    value: "Vetted",
    label: {
      vi: "Đối tác y khoa đã được kiểm duyệt",
      en: "Vetted medical partners",
    },
  },
  {
    id: "ai",
    value: "AI-assisted",
    label: {
      vi: "Phân tích bữa ăn hỗ trợ bởi AI",
      en: "AI-assisted meal analysis",
    },
  },
  {
    id: "privacy",
    value: "Private",
    label: {
      vi: "Dữ liệu sức khỏe được bảo vệ",
      en: "Health data kept private",
    },
  },
];
