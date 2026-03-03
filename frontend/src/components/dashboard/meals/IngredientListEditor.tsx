"use client";

import { useState, useRef, useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Trash2, Plus, Search, CheckCircle2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { searchIngredients, findIngredient, calcNutrition } from "@/data/ingredients";
import type { IngredientItem } from "@/types/api";
import type { AddMealFormValues } from "@/lib/validators/meal-schema";

interface IngredientListEditorProps {
  /** Field array name in the parent form */
  fieldName?: "ingredients";
}

export function IngredientListEditor({
  fieldName = "ingredients",
}: IngredientListEditorProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<AddMealFormValues>();

  const { fields, append, remove } = useFieldArray<AddMealFormValues>({
    name: fieldName,
  });

  const [suggestions, setSuggestions] = useState<IngredientItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setSuggestions([]);
        setFocusedRow(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const watchedIngredients = watch(fieldName);

  function handleNameInput(index: number, value: string) {
    setValue(`${fieldName}.${index}.ingredient_name`, value);
    setValue(`${fieldName}.${index}.is_matched`, false);
    if (value.length >= 1) {
      setSuggestions(searchIngredients(value));
      setFocusedRow(index);
    } else {
      setSuggestions([]);
      setFocusedRow(null);
    }
  }

  function handleSelectSuggestion(index: number, item: IngredientItem) {
    setValue(`${fieldName}.${index}.ingredient_name`, item.name_vi, {
      shouldDirty: true,
    });
    setValue(`${fieldName}.${index}.is_matched`, true);
    // Recalc calories if grams already entered
    const grams = watchedIngredients?.[index]?.grams ?? 0;
    if (grams > 0) {
      const calc = calcNutrition(item, grams);
      setValue(`${fieldName}.${index}.manual_calories`, calc.calories);
    }
    setSuggestions([]);
    setFocusedRow(null);
    setActiveIndex(null);
  }

  function getCaloriesDisplay(index: number): { value: string; matched: boolean } {
    const ing = watchedIngredients?.[index];
    if (!ing) return { value: "—", matched: false };

    const name = ing.ingredient_name ?? "";
    const grams = Number(ing.grams ?? 0);
    const dbItem = findIngredient(name);

    if (dbItem && grams > 0) {
      const calc = calcNutrition(dbItem, grams);
      return { value: `${calc.calories} kcal`, matched: true };
    }
    if (ing.manual_calories !== undefined && ing.manual_calories > 0) {
      return { value: `${ing.manual_calories} kcal`, matched: false };
    }
    return { value: "—", matched: false };
  }

  function handleAddRow() {
    append({
      ingredient_name: "",
      grams: 0,
      is_matched: false,
    });
  }

  const ingErrors = errors?.ingredients;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[1fr_100px_100px_36px] gap-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">Tên thành phần</span>
        <span className="text-xs font-medium text-muted-foreground text-center">Gram</span>
        <span className="text-xs font-medium text-muted-foreground text-center">Calo ước tính</span>
        <span />
      </div>

      <AnimatePresence initial={false}>
        {fields.map((field, index) => {
          const calDisplay = getCaloriesDisplay(index);
          const currentName = watchedIngredients?.[index]?.ingredient_name ?? "";
          const isMatched = watchedIngredients?.[index]?.is_matched ?? false;
          const rowError = Array.isArray(ingErrors)
            ? ingErrors[index]
            : undefined;

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {/* Mobile label */}
              <p className="sm:hidden text-xs font-medium text-muted-foreground mb-1">
                Thành phần {index + 1}
              </p>

              <div
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_36px] gap-2 relative"
                ref={focusedRow === index ? suggestionsRef : undefined}
              >
                {/* Name input */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      {...register(`${fieldName}.${index}.ingredient_name`)}
                      placeholder="VD: sợi phở, thịt bò, rau…"
                      className={cn(
                        "pl-8 pr-8",
                        rowError?.ingredient_name && "border-destructive"
                      )}
                      autoComplete="off"
                      onChange={(e) => handleNameInput(index, e.target.value)}
                    />
                    {isMatched && (
                      <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-green-500 pointer-events-none" />
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  <AnimatePresence>
                    {focusedRow === index && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          "absolute top-full left-0 right-0 z-50 mt-1",
                          "rounded-lg border border-border bg-popover shadow-lg",
                          "overflow-hidden"
                        )}
                      >
                        <ul className="py-1 max-h-48 overflow-y-auto">
                          {suggestions.map((item, si) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectSuggestion(index, item);
                                }}
                                className={cn(
                                  "w-full flex items-start gap-2 px-3 py-2 text-left",
                                  "hover:bg-accent transition-colors duration-100",
                                  activeIndex === si && "bg-accent"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">
                                    {item.name_vi}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.calories_per_100g} kcal / 100g
                                    <span className="mx-1">·</span>
                                    P {item.protein_per_100g}g
                                    <span className="mx-1">·</span>
                                    C {item.carbs_per_100g}g
                                    <span className="mx-1">·</span>
                                    F {item.fat_per_100g}g
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="px-3 py-2 border-t border-border bg-muted/30">
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Không tìm thấy? Gõ tên tự do + nhập calo thủ công bên dưới.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Gram input */}
                <div>
                  <div className="relative">
                    <Input
                      {...register(`${fieldName}.${index}.grams`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      inputMode="decimal"
                      placeholder="100"
                      className={cn(
                        "pr-9 text-center tabular-nums",
                        rowError?.grams && "border-destructive"
                      )}
                      min={1}
                      max={5000}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      g
                    </span>
                  </div>
                </div>

                {/* Calories display */}
                <div className="flex items-center justify-center">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "tabular-nums text-xs font-semibold min-w-[80px] justify-center",
                      calDisplay.matched
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {calDisplay.value}
                  </Badge>
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Xóa thành phần"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {/* Manual calories input (shown when no DB match) */}
              {!isMatched && currentName.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1.5 ml-0 sm:ml-8 flex items-center gap-2"
                >
                  <HelpCircle className="size-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Thành phần tự do — nhập calo thủ công (tùy chọn):
                  </span>
                  <div className="relative w-24">
                    <Input
                      {...register(`${fieldName}.${index}.manual_calories`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      className="pr-10 h-7 text-xs text-center tabular-nums"
                      min={0}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      kcal
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Row-level errors */}
              {rowError && (
                <div className="mt-1 space-y-0.5">
                  {rowError.ingredient_name && (
                    <p className="text-xs text-destructive">
                      {rowError.ingredient_name.message}
                    </p>
                  )}
                  {rowError.grams && (
                    <p className="text-xs text-destructive">
                      {rowError.grams.message}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Top-level array error */}
      {typeof ingErrors?.message === "string" && (
        <p className="text-sm text-destructive">{ingErrors.message}</p>
      )}

      {/* Add row button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="w-full border-dashed gap-2 text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-4" />
        Thêm thành phần
      </Button>
    </div>
  );
}
