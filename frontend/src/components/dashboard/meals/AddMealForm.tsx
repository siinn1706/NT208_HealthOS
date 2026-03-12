"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import {
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
import { motion } from "framer-motion";

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

import { IngredientListEditor } from "./IngredientListEditor";
import { NutritionSummaryCard } from "./NutritionSummaryCard";

import { addMealSchema, type AddMealFormValues } from "@/lib/validators/meal-schema";
import { bffFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MEAL_TYPES = [
  { value: "breakfast", icon: Sunrise, label: "Bữa sáng", color: "text-orange-400" },
  { value: "lunch",     icon: Sun,     label: "Bữa trưa", color: "text-yellow-400" },
  { value: "dinner",   icon: Moon,    label: "Bữa tối",  color: "text-indigo-400" },
  { value: "snack",    icon: Cookie,  label: "Bữa phụ",  color: "text-emerald-400" },
] as const;

function nowLocalDatetime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
        <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
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

export function AddMealForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    formState: { errors },
  } = methods;

  const mealType = watch("meal_type");

  async function onSubmit(data: AddMealFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        logged_at: new Date(data.logged_at).toISOString(),
      };

      await bffFetch("/api/v1/meals", {
        method: "POST",
        body: payload,
      });

      toast.success("Đã ghi món ăn thành công!", {
        description: `${data.name} — đã cập nhật nhật ký dinh dưỡng.`,
        action: {
          label: "Xem nhật ký",
          onClick: () => router.push("/dashboard/meals"),
        },
      });

      router.push("/dashboard/meals");
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-[1100px] mx-auto">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard/meals"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Nhật ký dinh dưỡng
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ChefHat className="size-6 text-primary" />
            Thêm món ăn thủ công
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập tên món, thêm thành phần và gram — hệ thống tự tính calo, protein, carbs, chất béo.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
            {/* Left column: form sections */}
            <div className="space-y-6">
              {/* ── Section 1: Thông tin chung ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0 }}
              >
                <SectionCard
                  icon={<ChefHat className="size-4" />}
                  title="Thông tin món ăn"
                  description="Đặt tên và chọn loại bữa ăn"
                >
                  <div className="space-y-4">
                    {/* Meal name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="meal-name">
                        Tên món ăn <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="meal-name"
                        {...register("name")}
                        placeholder="VD: Phở bò tái, Cơm sườn, Bún riêu..."
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
                        <Label htmlFor="meal-type">Loại bữa ăn</Label>
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

                      {/* Time */}
                      <div className="space-y-1.5">
                        <Label htmlFor="logged-at">
                          <Clock className="inline size-3.5 mr-1 text-muted-foreground" />
                          Thời gian
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
              </motion.div>

              {/* ── Section 2: Thành phần ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.08 }}
              >
                <SectionCard
                  icon={<Sparkles className="size-4" />}
                  title="Thành phần"
                  description="Thêm từng nguyên liệu và số gram — calo tự tính từ database dinh dưỡng"
                >
                  <IngredientListEditor />
                </SectionCard>
              </motion.div>

              {/* ── Section 3: Ghi chú ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.16 }}
              >
                <SectionCard
                  icon={<FileText className="size-4" />}
                  title="Ghi chú (tuỳ chọn)"
                  description="Ghi lại cảm nhận, nguồn gốc món ăn, hoặc thông tin thêm"
                >
                  <Textarea
                    {...register("notes")}
                    placeholder="VD: Ăn ở nhà hàng Phở 24, cảm thấy no vừa phải..."
                    rows={3}
                    className="resize-none"
                  />
                  {errors.notes && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.notes.message}
                    </p>
                  )}
                </SectionCard>
              </motion.div>

              {/* Submit area (mobile) */}
              <motion.div
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
                    Hủy
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
                    {isSubmitting ? "Đang lưu..." : "Ghi vào nhật ký"}
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Right column: sticky nutrition summary */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <NutritionSummaryCard />
              </motion.div>

              {/* Submit area (desktop) */}
              <motion.div
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
                  {isSubmitting ? "Đang lưu..." : "Ghi vào nhật ký"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/meals")}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
