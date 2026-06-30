"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import {
  AlertTriangle,
  ChefHat,
  Clock,
  FileText,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Sunrise,
  Sun,
  Moon,
  Cookie,
} from "lucide-react";
import { toast } from "sonner";
import { LazyMotion, domAnimation, m } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

import { IngredientListEditor } from "./IngredientListEditor";
import { NutritionSummaryCard } from "./NutritionSummaryCard";
import type { SnapPrefillPayload } from "./camera-analysis-normalizer";

import { addMealSchema, type AddMealFormValues } from "@/lib/validators/meal-schema";
import { bffFetch } from "@/lib/api-client";
import { hydrateCatalogIngredientsNutrition } from "@/lib/meal-ingredient-payload";
import { requestMealDiaryRefresh } from "@/lib/meal-diary-refresh";
import { cn } from "@/lib/utils";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useConnection } from "@/components/providers/offline-provider";

function nowLocalDatetime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const SNAP_PREFILL_KEY = "meal_snap_prefill";

interface AiReviewDetails {
  calorieRange?: string;
  portionLabel?: string;
  confidence?: number | null;
  warnings: string[];
}

/**
 * Consume the optional camera-snap prefill written to sessionStorage by
 * `<CameraCapture>`. The payload is single-shot: once we read it, we wipe it
 * so a later refresh of /dashboard/meals/add starts clean.
 */
function readSnapPrefill(): SnapPrefillPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SNAP_PREFILL_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(SNAP_PREFILL_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SnapPrefillPayload;
  } catch {
    return null;
  }
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <Separator />
      {children}
    </div>
  );
}

function readNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function MealTypeSelectLabel({
  icon: Icon,
  color,
  label,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <Icon className={`size-3.5 ${color}`} />
      {label}
    </span>
  );
}

export function AddMealForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsAiReview, setNeedsAiReview] = useState(false);
  const [aiReviewDetails, setAiReviewDetails] = useState<AiReviewDetails | null>(null);
  const t = useTranslations("dashboard.meals");
  const ta = useTranslations("addMeal");
  const tc = useTranslations("camera");
  const offlineQueue = useOfflineQueue();
  const { status: connectionStatus } = useConnection();

  const MEAL_TYPES = [
    { value: "breakfast", icon: Sunrise, label: t("mealTypes.breakfast"), color: "text-orange-400" },
    { value: "lunch",     icon: Sun,     label: t("mealTypes.lunch"), color: "text-yellow-400" },
    { value: "dinner",   icon: Moon,    label: t("mealTypes.dinner"),  color: "text-indigo-400" },
    { value: "snack",    icon: Cookie,  label: t("mealTypes.snack"),  color: "text-emerald-400" },
  ] as const;

  const methods = useForm<AddMealFormValues>({
    resolver: zodResolver(addMealSchema),
    defaultValues: {
      name: "",
      meal_type: "lunch",
      logged_at: nowLocalDatetime(),
      notes: "",
      ingredients: [
        { ingredient_name: "", grams: 0, is_matched: false },
      ],
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors },
  } = methods;

  const mealType = watch("meal_type");

  function navigateToMealsDiary(options: { refreshDiary?: boolean } = {}) {
    if (options.refreshDiary) requestMealDiaryRefresh();
    router.push("/dashboard/meals");
  }

  // Hydrate the form from the AI snap prefill on mount. Reading sessionStorage
  // requires the browser, so we run it inside `useEffect` to stay SSR-safe.
  useEffect(() => {
    const prefill = readSnapPrefill();
    if (!prefill) return;

    const prefilledName = typeof prefill.name === "string" ? prefill.name.trim() : "";
    const ingredients = Array.isArray(prefill.ingredients) && prefill.ingredients.length > 0
      ? prefill.ingredients.flatMap((ing) => {
          const ingredientName = typeof ing.ingredient_name === "string" ? ing.ingredient_name.trim() : "";
          if (ingredientName.length === 0) return [];
          return [{
            ingredient_name: ingredientName,
            grams: typeof ing.grams === "number" && ing.grams > 0 ? ing.grams : 1,
            manual_calories: readNonNegativeNumber(ing.calories),
            protein_g: readNonNegativeNumber(ing.protein_g),
            carbs_g: readNonNegativeNumber(ing.carbs_g),
            fat_g: readNonNegativeNumber(ing.fat_g),
            is_matched: false,
          }];
        })
      : [];
    const aggregateCalories = readNonNegativeNumber(prefill.estimatedCalories);
    const aggregateFallback =
      ingredients.length === 0 && prefilledName && aggregateCalories !== undefined
        ? [{
            ingredient_name: prefilledName,
            grams: 100,
            manual_calories: aggregateCalories,
            is_matched: false,
          }]
        : [];

    resetForm({
      name: prefilledName,
      meal_type:
        prefill.meal_type === "breakfast" ||
        prefill.meal_type === "lunch" ||
        prefill.meal_type === "dinner" ||
        prefill.meal_type === "snack"
          ? prefill.meal_type
          : "lunch",
      logged_at: nowLocalDatetime(),
      notes: "",
      ingredients:
        ingredients.length > 0
          ? ingredients
          : aggregateFallback.length > 0
            ? aggregateFallback
            : [{ ingredient_name: "", grams: 0, is_matched: false }],
    });

    if (prefill.needs_review === true) {
      setNeedsAiReview(true);
    }
    const selectedPortion = prefill.nutrition?.selected_portion;
    const portionLabel = prefill.nutrition?.portion_options?.find(
      (item) => item.value === selectedPortion,
    )?.label;
    const min = readNonNegativeNumber(prefill.nutrition?.calorie_min);
    const max = readNonNegativeNumber(prefill.nutrition?.calorie_max);
    const warnings = Array.isArray(prefill.nutrition?.warnings)
      ? prefill.nutrition.warnings.filter((item) => typeof item === "string" && item.trim())
      : [];
    setAiReviewDetails({
      calorieRange: min !== undefined && max !== undefined
        ? `${Math.round(min)}-${Math.round(max)} kcal`
        : undefined,
      portionLabel,
      confidence: prefill.confidence,
      warnings,
    });
  }, [resetForm]);

  async function onSubmit(data: AddMealFormValues) {
    setIsSubmitting(true);
    const ingredients = hydrateCatalogIngredientsNutrition(data.ingredients);
    const payload = {
      ...data,
      ingredients,
      logged_at: new Date(data.logged_at).toISOString(),
    };

    try {
      await bffFetch("/api/v1/meals", {
        method: "POST",
        body: payload,
      });

      toast.success(t("saveSuccess"), {
        description: `${data.name}`,
        action: {
          label: t("viewDiary"),
          onClick: () => navigateToMealsDiary({ refreshDiary: true }),
        },
      });

      navigateToMealsDiary({ refreshDiary: true });
    } catch (err) {
      // If we look offline, save the mutation locally and let the queue
      // replay it when connection returns. Otherwise report a hard failure.
      const looksOffline =
        connectionStatus !== "online" ||
        (typeof navigator !== "undefined" && navigator.onLine === false) ||
        (err instanceof TypeError);

      if (looksOffline) {
        offlineQueue.enqueue({
          url: "/api/v1/meals",
          method: "POST",
          body: payload,
          label: data.name,
        });
        toast.success(ta("savedOffline"), {
          description: ta("savedOfflineDescription"),
        });
        navigateToMealsDiary();
      } else {
        toast.error(t("saveFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <LazyMotion features={domAnimation}>
      <div className="max-w-[1100px] mx-auto">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard/meals"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {t("diary")}
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ChefHat className="size-6 text-primary" />
            {ta("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ta("subtitle")}
          </p>
        </div>

        {needsAiReview && (
          <output
            className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 flex items-start gap-3"
          >
            <AlertTriangle
              className="size-5 text-warning flex-shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-warning">
                {tc("lowConfidenceTitle")}
              </p>
              <p className="text-xs text-warning/90">
                {tc("lowConfidenceBody")}
              </p>
            </div>
          </output>
        )}

        {aiReviewDetails && (
          <output className="mb-6 rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  AI estimate ready for confirmation
                </p>
                <p className="text-xs text-muted-foreground">
                  {[
                    aiReviewDetails.calorieRange,
                    aiReviewDetails.portionLabel ? `Portion: ${aiReviewDetails.portionLabel}` : undefined,
                    typeof aiReviewDetails.confidence === "number"
                      ? `Confidence: ${Math.round(
                          aiReviewDetails.confidence <= 1
                            ? aiReviewDetails.confidence * 100
                            : aiReviewDetails.confidence,
                        )}%`
                      : undefined,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {aiReviewDetails.warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                {aiReviewDetails.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </output>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
            {/* Left column: form sections */}
            <div className="space-y-6">
              {/* ── Section 1: Thông tin chung ── */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0 }}
              >
                <SectionCard
                  icon={<ChefHat className="size-4" />}
                  title={ta("dishNameTitle")}
                  description={ta("dishNameSubtitle")}
                >
                  <div className="space-y-4">
                    {/* Meal name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="meal-name">
                        {ta("dishName")} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="meal-name"
                        {...register("name")}
                        placeholder={ta("dishNamePlaceholder")}
                        className={cn(errors.name && "border-destructive")}
                        autoFocus
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Meal type + logged_at row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Meal type */}
                      <div className="space-y-1.5">
                        <Label htmlFor="meal-type">{ta("mealType")}</Label>
                        <Select
                          value={mealType}
                          onValueChange={(v) =>
                            setValue(
                              "meal_type",
                              v as AddMealFormValues["meal_type"]
                            )
                          }
                        >
                          <SelectTrigger id="meal-type" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEAL_TYPES.map((mt) => (
                              <SelectItem key={mt.value} value={mt.value}>
                                <MealTypeSelectLabel
                                  icon={mt.icon}
                                  color={mt.color}
                                  label={mt.label}
                                />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Time */}
                      <div className="space-y-1.5">
                        <Label htmlFor="logged-at">
                          <Clock className="inline size-3.5 mr-1 text-muted-foreground" />
                          {ta("loggedAt")}
                        </Label>
                        <Input
                          id="logged-at"
                          {...register("logged_at")}
                          type="datetime-local"
                          className={cn(errors.logged_at && "border-destructive")}
                        />
                        {errors.logged_at && (
                          <p className="text-xs text-destructive">
                            {errors.logged_at.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </m.div>

              {/* ── Section 2: Thành phần ── */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.08 }}
              >
                <SectionCard
                  icon={<Sparkles className="size-4" />}
                  title={ta("sectionGeneral")}
                  description={ta("dishNameSubtitle")}
                >
                  <IngredientListEditor />
                </SectionCard>
              </m.div>

              {/* ── Section 3: Ghi chú ── */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.16 }}
              >
                <SectionCard
                  icon={<FileText className="size-4" />}
                  title={ta("notesTitle")}
                  description={ta("notesLabel")}
                >
                  <Textarea
                    {...register("notes")}
                    placeholder={ta("notesPlaceholder")}
                    rows={3}
                    className="resize-none"
                  />
                  {errors.notes && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.notes.message}
                    </p>
                  )}
                </SectionCard>
              </m.div>

              {/* Submit area (mobile) */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.24 }}
                className="lg:hidden"
              >
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/dashboard/meals")}
                    disabled={isSubmitting}
                  >
                    {ta("cancel")}
                  </Button>
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
                    {isSubmitting ? ta("saving") : ta("submit")}
                  </Button>
                </div>
              </m.div>
            </div>

            {/* Right column: sticky nutrition summary */}
            <div className="space-y-4">
              <m.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <NutritionSummaryCard />
              </m.div>

              {/* Submit area (desktop) */}
              <m.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="hidden lg:flex flex-col gap-3"
              >
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {isSubmitting ? ta("saving") : ta("submit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/meals")}
                  disabled={isSubmitting}
                >
                  {ta("cancel")}
                </Button>
              </m.div>
            </div>
          </div>
        </form>
      </div>
      </LazyMotion>
    </FormProvider>
  );
}
