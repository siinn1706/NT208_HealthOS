"use client";

import { useState } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowRight, CheckCircle2, Sunrise, Sun, Moon, Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";
import { bffFetch } from "@/lib/api-client";
import { findIngredient, calcNutrition, searchIngredients } from "@/data/ingredients";
import {
  quickMealSchema,
  type QuickMealFormValues,
} from "@/lib/validators/meal-schema";

const MEAL_TYPES = [
  { value: "breakfast", icon: Sunrise, label: "Bữa sáng", color: "text-orange-400" },
  { value: "lunch",     icon: Sun,     label: "Bữa trưa", color: "text-yellow-400" },
  { value: "dinner",   icon: Moon,    label: "Bữa tối",  color: "text-indigo-400" },
  { value: "snack",    icon: Cookie,  label: "Bữa phụ",  color: "text-emerald-400" },
] as const;

interface QuickMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickMealSheet({ open, onOpenChange }: QuickMealSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropdownItems, setDropdownItems] = useState<
    ReturnType<typeof searchIngredients>
  >([]);

  const methods = useForm<QuickMealFormValues>({
    resolver: zodResolver(quickMealSchema),
    defaultValues: {
      name: "",
      meal_type: "lunch",
      ingredients: [{ ingredient_name: "", grams: 0, is_matched: false }],
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = methods;

  const { fields, append, remove } = useFieldArray<QuickMealFormValues>({
    control: methods.control,
    name: "ingredients",
  });

  const watchedIngredients = watch("ingredients");
  const watchedMealType = watch("meal_type");

  // Compute total calories from ingredients
  const totalCalories = (watchedIngredients ?? []).reduce((sum, ing) => {
    if (!ing.ingredient_name || !ing.grams || ing.grams <= 0) return sum;
    const dbItem = findIngredient(ing.ingredient_name);
    if (dbItem) {
      return sum + calcNutrition(dbItem, ing.grams).calories;
    }
    return sum + (ing.manual_calories ?? 0);
  }, 0);

  function handleNameInput(index: number, value: string) {
    setValue(`ingredients.${index}.ingredient_name`, value);
    setValue(`ingredients.${index}.is_matched`, false);
    if (value.length >= 1) {
      setDropdownItems(searchIngredients(value));
      setActiveDropdown(index);
    } else {
      setActiveDropdown(null);
    }
  }

  function handleSelectSuggestion(
    index: number,
    item: ReturnType<typeof searchIngredients>[number]
  ) {
    setValue(`ingredients.${index}.ingredient_name`, item.name_vi, {
      shouldDirty: true,
    });
    setValue(`ingredients.${index}.is_matched`, true);
    setActiveDropdown(null);
  }

  async function onSubmit(data: QuickMealFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        logged_at: new Date().toISOString(),
      };
      await bffFetch("/api/v1/meals", { method: "POST", body: payload });
      toast.success(`Đã ghi "${data.name}"!`, {
        description: `${Math.round(totalCalories)} kcal • Xem nhật ký để chi tiết.`,
      });
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] overflow-y-auto flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            🍽️ Ghi bữa ăn nhanh
          </SheetTitle>
          <SheetDescription className="text-xs">
            Nhập thông tin cơ bản. Cần chi tiết hơn?{" "}
            <Link
              href="/dashboard/meals/add"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Nhập đầy đủ →
            </Link>
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col flex-1"
          >
            <div className="flex-1 px-6 py-4 space-y-5 overflow-y-auto">
              {/* Meal name */}
              <div className="space-y-1.5">
                <Label htmlFor="quick-meal-name">
                  Tên món <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quick-meal-name"
                  {...register("name")}
                  placeholder="VD: Phở bò, Cơm chiên..."
                  className={cn(errors.name && "border-destructive")}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Meal type */}
              <div className="space-y-1.5">
                <Label>Loại bữa</Label>
                <Select
                  value={watchedMealType}
                  onValueChange={(v) =>
                    setValue("meal_type", v as QuickMealFormValues["meal_type"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className={`size-3.5 ${t.color}`} />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <Label>
                  Thành phần <span className="text-destructive">*</span>
                </Label>
                <AnimatePresence initial={false}>
                  {fields.map((field, index) => {
                    const name =
                      watchedIngredients?.[index]?.ingredient_name ?? "";
                    const grams = watchedIngredients?.[index]?.grams ?? 0;
                    const dbItem = name ? findIngredient(name) : undefined;
                    const kcal =
                      dbItem && grams > 0
                        ? calcNutrition(dbItem, grams).calories
                        : undefined;
                    const ingErr = Array.isArray(errors.ingredients)
                      ? errors.ingredients[index]
                      : undefined;

                    return (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1"
                      >
                        <div className="flex gap-2 relative">
                          {/* Name */}
                          <div className="flex-1 relative">
                            <Input
                              {...register(`ingredients.${index}.ingredient_name`)}
                              placeholder="Tên nguyên liệu"
                              className={cn(
                                "text-sm",
                                ingErr?.ingredient_name && "border-destructive"
                              )}
                              autoComplete="off"
                              onChange={(e) =>
                                handleNameInput(index, e.target.value)
                              }
                            />
                            {/* Dropdown */}
                            <AnimatePresence>
                              {activeDropdown === index &&
                                dropdownItems.length > 0 && (
                                  <motion.ul
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-40 overflow-y-auto"
                                  >
                                    {dropdownItems.map((item) => (
                                      <li key={item.id}>
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectSuggestion(index, item);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
                                        >
                                          <span className="font-medium">
                                            {item.name_vi}
                                          </span>
                                          <span className="text-muted-foreground ml-1.5">
                                            {item.calories_per_100g}kcal/100g
                                          </span>
                                        </button>
                                      </li>
                                    ))}
                                  </motion.ul>
                                )}
                            </AnimatePresence>
                          </div>

                          {/* Grams */}
                          <div className="relative w-20 flex-shrink-0">
                            <Input
                              {...register(`ingredients.${index}.grams`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              inputMode="decimal"
                              placeholder="100"
                              className={cn(
                                "text-sm text-center pr-6 tabular-nums",
                                ingErr?.grams && "border-destructive"
                              )}
                              min={1}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              g
                            </span>
                          </div>

                          {/* Remove */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(index)}
                            className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Xóa"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        {/* Inline calo badge */}
                        {kcal !== undefined && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-1.5 pl-1"
                          >
                            <CheckCircle2 className="size-3 text-green-500" />
                            <span className="text-xs text-muted-foreground">
                              ≈{Math.round(kcal)} kcal
                            </span>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ ingredient_name: "", grams: 0, is_matched: false })
                  }
                  className="w-full border-dashed text-xs gap-1.5 text-muted-foreground"
                >
                  <Plus className="size-3.5" />
                  Thêm thành phần
                </Button>

                {typeof errors.ingredients?.message === "string" && (
                  <p className="text-xs text-destructive">
                    {errors.ingredients.message}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border space-y-3 bg-card">
              {/* Total preview */}
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Tổng calo ước tính
                </span>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 tabular-nums font-bold"
                >
                  {Math.round(totalCalories)} kcal
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {isSubmitting ? "Đang lưu..." : "Lưu nhanh"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  asChild
                  title="Nhập chi tiết"
                >
                  <Link
                    href="/dashboard/meals/add"
                    onClick={() => onOpenChange(false)}
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
