/**
 * Mock meal data for development / MVP.
 * Replace with BFF fetch() calls in V1.
 */

import type { Meal, NutritionSuggestion, WeeklyCaloriePoint } from "@/types/api";

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const dayAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(today.getDate() - n);
  return d;
};

export const MOCK_MEALS: Meal[] = [
  // ── Hôm nay ──────────────────────────────────────────────────────
  {
    id: "meal-001",
    name: "Phở bò tái",
    status: "analyzed",
    meal_type: "breakfast",
    ingredients: [
      { ingredient_name: "Sợi phở (đã chần)", grams: 200, calories: 218, protein_g: 4.4, carbs_g: 48.2, fat_g: 0.4, is_custom: false },
      { ingredient_name: "Thịt bò (thăn nạc, luộc)", grams: 120, calories: 258, protein_g: 31.3, carbs_g: 0.0, fat_g: 14.4, is_custom: false },
      { ingredient_name: "Nước dùng bò", grams: 400, calories: 48, protein_g: 5.6, carbs_g: 2.4, fat_g: 1.6, is_custom: false },
      { ingredient_name: "Giá đỗ", grams: 50, calories: 15, protein_g: 1.5, carbs_g: 3.0, fat_g: 0.1, is_custom: false },
    ],
    nutrition_result: { calories: 539, protein_g: 42.8, carbs_g: 53.6, fat_g: 16.5, confidence: 0.98 },
    logged_at: fmt(new Date(today.setHours(7, 30, 0, 0))),
    created_at: fmt(new Date(today.setHours(7, 32, 0, 0))),
  },
  {
    id: "meal-002",
    name: "Cơm sườn non",
    status: "analyzed",
    meal_type: "lunch",
    ingredients: [
      { ingredient_name: "Cơm trắng (đã nấu)", grams: 250, calories: 325, protein_g: 6.8, carbs_g: 71.5, fat_g: 0.8, is_custom: false },
      { ingredient_name: "Thịt heo (nạc, luộc)", grams: 150, calories: 293, protein_g: 42.0, carbs_g: 0.0, fat_g: 13.5, is_custom: false },
      { ingredient_name: "Cà chua", grams: 80, calories: 14, protein_g: 0.7, carbs_g: 3.1, fat_g: 0.2, is_custom: false },
      { ingredient_name: "Rau muống", grams: 100, calories: 19, protein_g: 2.6, carbs_g: 1.8, fat_g: 0.2, is_custom: false },
    ],
    nutrition_result: { calories: 651, protein_g: 52.1, carbs_g: 76.4, fat_g: 14.7, confidence: 0.97 },
    logged_at: fmt(new Date(new Date().setHours(12, 0, 0, 0))),
    created_at: fmt(new Date(new Date().setHours(12, 5, 0, 0))),
  },

  // ── Hôm qua ──────────────────────────────────────────────────────
  {
    id: "meal-003",
    name: "Bún bò Huế",
    status: "analyzed",
    meal_type: "breakfast",
    ingredients: [
      { ingredient_name: "Bún (đã luộc)", grams: 200, calories: 218, protein_g: 4.0, carbs_g: 49.6, fat_g: 0.4, is_custom: false },
      { ingredient_name: "Thịt bò (thăn nạc, luộc)", grams: 80, calories: 172, protein_g: 20.9, carbs_g: 0.0, fat_g: 9.6, is_custom: false },
      { ingredient_name: "Nước dùng bò", grams: 400, calories: 48, protein_g: 5.6, carbs_g: 2.4, fat_g: 1.6, is_custom: false },
    ],
    nutrition_result: { calories: 438, protein_g: 30.5, carbs_g: 52.0, fat_g: 11.6, confidence: 0.96 },
    logged_at: fmt(dayAgo(1)),
    created_at: fmt(dayAgo(1)),
  },
  {
    id: "meal-004",
    name: "Cơm gà hấp",
    status: "analyzed",
    meal_type: "lunch",
    ingredients: [
      { ingredient_name: "Cơm trắng (đã nấu)", grams: 220, calories: 286, protein_g: 5.9, carbs_g: 62.9, fat_g: 0.7, is_custom: false },
      { ingredient_name: "Thịt gà (ức, luộc)", grams: 180, calories: 297, protein_g: 55.8, carbs_g: 0.0, fat_g: 6.5, is_custom: false },
      { ingredient_name: "Hành tây", grams: 40, calories: 16, protein_g: 0.4, carbs_g: 3.7, fat_g: 0.0, is_custom: false },
    ],
    nutrition_result: { calories: 599, protein_g: 62.1, carbs_g: 66.6, fat_g: 7.2, confidence: 0.97 },
    logged_at: fmt(dayAgo(1)),
    created_at: fmt(dayAgo(1)),
  },
  {
    id: "meal-005",
    name: "Canh chua cá",
    status: "analyzed",
    meal_type: "dinner",
    ingredients: [
      { ingredient_name: "Cơm trắng (đã nấu)", grams: 200, calories: 260, protein_g: 5.4, carbs_g: 57.2, fat_g: 0.6, is_custom: false },
      { ingredient_name: "Cá tra (phi lê, luộc)", grams: 150, calories: 135, protein_g: 27.0, carbs_g: 0.0, fat_g: 3.0, is_custom: false },
      { ingredient_name: "Cà chua", grams: 100, calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, is_custom: false },
      { ingredient_name: "Giá đỗ", grams: 80, calories: 24, protein_g: 2.4, carbs_g: 4.7, fat_g: 0.2, is_custom: false },
    ],
    nutrition_result: { calories: 437, protein_g: 35.7, carbs_g: 65.8, fat_g: 4.0, confidence: 0.97 },
    logged_at: fmt(dayAgo(1)),
    created_at: fmt(dayAgo(1)),
  },

  // ── 2 ngày trước ──────────────────────────────────────────────────
  {
    id: "meal-006",
    name: "Bánh mì thịt",
    status: "analyzed",
    meal_type: "breakfast",
    ingredients: [
      { ingredient_name: "Bánh mì", grams: 150, calories: 398, protein_g: 13.5, carbs_g: 73.5, fat_g: 4.8, is_custom: false },
      { ingredient_name: "Chả lụa (giò lụa)", grams: 80, calories: 136, protein_g: 13.6, carbs_g: 2.4, fat_g: 8.0, is_custom: false },
      { ingredient_name: "Cà chua", grams: 60, calories: 11, protein_g: 0.5, carbs_g: 2.3, fat_g: 0.1, is_custom: false },
    ],
    nutrition_result: { calories: 545, protein_g: 27.6, carbs_g: 78.2, fat_g: 12.9, confidence: 0.96 },
    logged_at: fmt(dayAgo(2)),
    created_at: fmt(dayAgo(2)),
  },
];

export const MOCK_NUTRITION_SUGGESTIONS: NutritionSuggestion[] = [
  {
    id: "sug-001",
    type: "warning",
    icon: "TriangleAlert",
    title: "Thiếu calo bữa tối",
    message: "Bạn đã ăn 1.190 kcal hôm nay — còn thiếu khoảng 810 kcal so với mục tiêu 2.000 kcal. Bữa tối nên bổ sung thêm.",
    priority: 1,
    cta: { label: "+ Thêm bữa tối", href: "/dashboard/meals/add" },
  },
  {
    id: "sug-002",
    type: "tip",
    icon: "Beef",
    title: "Protein hôm nay tốt!",
    message: "Bạn đã nạp 95g protein — đạt 119% mục tiêu 80g. Lượng protein tốt hỗ trợ phục hồi cơ bắp sau vận động.",
    priority: 2,
  },
  {
    id: "sug-003",
    type: "goal",
    icon: "Wheat",
    title: "Cân bằng carbs",
    message: "Tỷ lệ carbs của bạn hôm nay chiếm 54% năng lượng. Khuyến nghị là 45–65% — bạn đang trong vùng lý tưởng!",
    priority: 3,
  },
  {
    id: "sug-004",
    type: "tip",
    icon: "Droplets",
    title: "Đừng quên uống nước",
    message: "Kết hợp dinh dưỡng tốt với đủ nước uống (1.5–2L/ngày) giúp tối ưu hóa quá trình trao đổi chất.",
    priority: 4,
    cta: { label: "Hỏi AI dinh dưỡng", href: "/dashboard/chat" },
  },
];

/** Deterministic weekly chart data (no Math.random for SSR stability) */
export function getMockWeeklyCalorieData(): WeeklyCaloriePoint[] {
  const offsets = [1820, 1950, 1640, 2100, 1870, 1190, 0];
  const proteinData = [72, 85, 65, 90, 78, 95, 0];
  const carbsData = [245, 265, 220, 285, 252, 130, 0];
  const fatData = [65, 70, 58, 75, 68, 34, 0];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return {
      date: `${mm}/${dd}`,
      full_date: `${yyyy}-${mm}-${dd}`,
      calories: offsets[i],
      protein_g: proteinData[i],
      carbs_g: carbsData[i],
      fat_g: fatData[i],
      target: 2000,
    };
  });
}
