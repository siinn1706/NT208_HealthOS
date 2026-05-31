import { z } from "zod";

export const mealIngredientSchema = z.object({
  ingredient_name: z
    .string()
    .min(1, { message: "Tên thành phần không được để trống." })
    .max(100, { message: "Tên thành phần không được vượt quá 100 ký tự." }),
  /**
   * B7 — locale-paired English name (when picked from the catalog) so the
   * meal payload survives a locale switch and ML pipelines can search both.
   * Optional: free-text rows submitted from the VI form leave it blank.
   */
  ingredient_name_en: z.string().max(100).optional(),
  /** Stable ingredient id (UUID) when the row came from the catalog. */
  ingredient_id: z.uuid().optional(),
  grams: z
    .number()
    .min(1, { message: "Gram phải ít nhất 1g." })
    .max(5000, { message: "Gram không được vượt quá 5000g." }),
  /** Auto-calculated from ingredient DB, or manually entered */
  manual_calories: z.number().min(0).max(10000).optional(),
  /** AI-provided macros preserved when editing photo analysis results. */
  protein_g: z.number().min(0).max(10000).optional(),
  carbs_g: z.number().min(0).max(10000).optional(),
  fat_g: z.number().min(0).max(10000).optional(),
  /** True when ingredient was selected from DB suggestion */
  is_matched: z.boolean().optional(),
});

export const addMealSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Tên món ăn phải có ít nhất 2 ký tự." })
    .max(100, { message: "Tên món ăn không được vượt quá 100 ký tự." }),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  logged_at: z.string().min(1, { message: "Vui lòng chọn thời gian." }),
  notes: z.string().max(500).optional(),
  ingredients: z
    .array(mealIngredientSchema)
    .min(1, { message: "Vui lòng thêm ít nhất 1 thành phần." }),
});

export const quickMealSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Tên món ăn phải có ít nhất 2 ký tự." })
    .max(100),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  ingredients: z
    .array(mealIngredientSchema)
    .min(1, { message: "Vui lòng thêm ít nhất 1 thành phần." }),
});

export type AddMealFormValues = z.infer<typeof addMealSchema>;
export type QuickMealFormValues = z.infer<typeof quickMealSchema>;
export type MealIngredientFormValues = z.infer<typeof mealIngredientSchema>;
