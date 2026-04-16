"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// POST /api/v1/meals/analyze-photo
// Trigger: user submits a captured/uploaded image
// Request: FormData { name: string, image: File }
// Response: { job_id: string, status: string }
//
// GET /api/v1/meals/analyze-photo/:job_id
// Trigger: polling after photo submission (every 2s up to 30s)
// Response: { job_id: string, status: string }

interface AnalysisIngredient {
  ingredient_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface AnalysisResult {
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: AnalysisIngredient[];
  estimatedCalories: number | null;
  nutrition?: {
    dish_name?: string;
    serving_type?: string;
    saturates_g?: number;
    sugar_g?: number;
    salt_g?: number;
    source?: string;
  };
}

type AnalysisStep =
  | "idle"          // No image yet
  | "preview"       // Image captured, ready to analyze
  | "analyzing"     // Waiting for AI
  | "result"        // Analysis done
  | "error";        // Something went wrong

const STEP_MESSAGES = [
  "Đang nhận diện thành phần...",
  "Ước lượng khẩu phần...",
  "Tính toán dinh dưỡng...",
  "Đang hoàn thiện kết quả...",
];

export function CameraCapture() {
  const router = useRouter();
  const t = useTranslations("camera");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<AnalysisStep>("idle");
  const [captureMode, setCaptureMode] = useState<"upload" | "camera" | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [processingMsg, setProcessingMsg] = useState(t("analyzing"));
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // ── Upload flow ──────────────────────────────────────────────────
  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MiB — matches BFF proxy limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ảnh phải nhỏ hơn 1 MB. Vui lòng chọn ảnh khác.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageDataUrl(ev.target?.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
  };

  // ── Camera flow ──────────────────────────────────────────────────
  const startCamera = async () => {
    setCaptureMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch {
      // Camera permission denied or unavailable — fall back to upload
      setCaptureMode("upload");
      fileInputRef.current?.click();
    }
  };

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImageDataUrl(dataUrl);

    // Stop stream
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setStreamActive(false);
    setStep("preview");
  }, []);

  // Convert data URL to File
  const dataUrlToFile = (dataUrl: string, fileName: string): File => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: mime });
  };

  const fetchAnalyzedMealByJob = useCallback(async (jobId: string): Promise<AnalysisResult | null> => {
    const res = await fetch("/api/v1/meals?page=1&per_page=100", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const list = Array.isArray(json?.data) ? json.data : [];
    const meal = list.find((item: Record<string, unknown>) => item?.job_id === jobId);
    if (!meal) return null;

    const nutrition = (meal.nutrition_result ?? null) as
      | {
          calories?: number | null;
          dish_name?: string;
          serving_type?: string;
          saturates_g?: number;
          sugar_g?: number;
          salt_g?: number;
          source?: string;
        }
      | null;

    return {
      name: typeof meal.name === "string" ? meal.name : "Chưa có thông tin",
      meal_type: "lunch",
      ingredients: [],
      estimatedCalories: typeof nutrition?.calories === "number" ? nutrition.calories : null,
      nutrition: nutrition
        ? {
            dish_name: typeof nutrition.dish_name === "string" ? nutrition.dish_name : undefined,
            serving_type: typeof nutrition.serving_type === "string" ? nutrition.serving_type : undefined,
            saturates_g: typeof nutrition.saturates_g === "number" ? nutrition.saturates_g : undefined,
            sugar_g: typeof nutrition.sugar_g === "number" ? nutrition.sugar_g : undefined,
            salt_g: typeof nutrition.salt_g === "number" ? nutrition.salt_g : undefined,
            source: typeof nutrition.source === "string" ? nutrition.source : undefined,
          }
        : undefined,
    };
  }, []);

  // ── Analysis ─────────────────────────────────────────────────────
  const startAnalysis = async () => {
    if (!imageDataUrl) return;
    setStep("analyzing");

    // Cycle through step messages
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % STEP_MESSAGES.length;
      setProcessingMsg(STEP_MESSAGES[msgIdx]);
    }, 900);

    try {
      // POST to BFF analyze-photo endpoint
      const formData = new FormData();
      formData.append("name", "Meal " + new Date().toLocaleTimeString());
      formData.append("image", dataUrlToFile(imageDataUrl, "meal.jpg"));

      const res = await fetch("/api/v1/meals/analyze-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to start analysis");
      }

      const startData = await res.json().catch(() => null);
      const job_id = typeof startData?.job_id === "string" ? startData.job_id : "";
      let jobStatus = typeof startData?.status === "string" ? startData.status : "processing";
      if (!job_id) throw new Error("Invalid analysis job");

      // Poll for job completion
      const maxRetries = 15; // 30 seconds total
      let retries = 0;

      while (retries < maxRetries && jobStatus === "processing") {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`/api/v1/meals/analyze-photo/${job_id}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json().catch(() => null);
          if (typeof pollData?.status === "string") {
            jobStatus = pollData.status;
          }
        }
        retries++;
      }

      if (jobStatus === "analyzed" || jobStatus === "done") {
        const analyzed = await fetchAnalyzedMealByJob(job_id);
        if (analyzed) {
          setAnalysisResult(analyzed);
          setStep("result");
        } else {
          setStep("error");
        }
      } else {
        setStep("error");
      }
    } catch {
      setStep("error");
    } finally {
      clearInterval(interval);
    }
  };

  const reset = () => {
    setStep("idle");
    setCaptureMode(null);
    setImageDataUrl(null);
    setStreamActive(false);
    setAnalysisResult(null);
    setProcessingMsg(STEP_MESSAGES[0]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Navigate to AddMeal page pre-filled
  const proceedToForm = () => {
    // BFF TODO: Pass analysisResult as searchParam or sessionStorage to AddMealForm
    // for now, store in sessionStorage so AddMealForm can pick up prefill data
    if (analysisResult) {
      sessionStorage.setItem("meal_snap_prefill", JSON.stringify(analysisResult));
    }
    router.push("/dashboard/meals/add");
  };

  const totalCalories =
    analysisResult?.ingredients.reduce((sum, i) => sum + i.calories, 0) ??
    analysisResult?.estimatedCalories ??
    0;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* ── Hidden inputs ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* ── Step: Idle ── */}
      {step === "idle" && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-8 h-8 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t("aiSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button
              onClick={startCamera}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label={t("openCamera")}
            >
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-foreground">{t("capture")}</span>
            </button>
            <button
              onClick={() => { setCaptureMode("upload"); fileInputRef.current?.click(); }}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label={t("upload")}
            >
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-foreground">{t("upload")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Camera live view ── */}
      {step === "idle" && captureMode === "camera" && streamActive && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            aria-label="Camera preview"
          />
          {/* Capture button */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={captureFromCamera}
              className="w-14 h-14 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-105 transition-transform cursor-pointer active:scale-95"
              aria-label={t("capturePhoto")}
            />
            <button
              onClick={reset}
              className="absolute right-4 top-0 translate-y-0 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer"
              aria-label={t("cancelCamera")}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === "preview" && imageDataUrl && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt={t("takenAlt")}
              className="w-full h-full object-cover"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              aria-label={t("deletePhoto")}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {t("retake")}
            </button>
            <button
              onClick={startAnalysis}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label={t("analyzeAria")}
            >
              <Sparkles className="w-4 h-4" />
              {t("analyze")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Analyzing ── */}
      {step === "analyzing" && (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center gap-5 text-center">
          {/* Pulsing AI icon */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" aria-hidden />
            </div>
          </div>
          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt={t("analyzingAlt")}
              className="w-24 h-24 rounded-xl object-cover border border-border opacity-60"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{t("analyzing")}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              {processingMsg}
            </p>
          </div>
        </div>
      )}

      {/* ── Step: Result ── */}
      {step === "result" && analysisResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm font-semibold text-foreground">
              {t("analyzeComplete")}
            </p>
          </div>

          {/* Preview thumbnail */}
          {imageDataUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt={t("mealPhotoAlt")}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{analysisResult.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("aiIdentified")}</p>
              </div>
              <div className="ml-auto text-right flex-shrink-0">
                <p className="text-base font-bold text-foreground">{totalCalories}</p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
            </div>
          )}

          {/* Ingredient list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("ingredientsFound", { n: analysisResult.ingredients.length })}
              </p>
            </div>
            {analysisResult.ingredients.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">{t("noInfo")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {analysisResult.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {ing.ingredient_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ing.grams}g · P {ing.protein_g}g · C {ing.carbs_g}g · F {ing.fat_g}g
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground flex-shrink-0">
                      {ing.calories} kcal
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {analysisResult.nutrition && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("nutritionDetails")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-rose-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("saturates")}</p>
                  <p className="text-xs font-bold text-rose-500 tabular-nums">
                    {(analysisResult.nutrition.saturates_g ?? 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded-md bg-fuchsia-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("sugar")}</p>
                  <p className="text-xs font-bold text-fuchsia-500 tabular-nums">
                    {(analysisResult.nutrition.sugar_g ?? 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded-md bg-sky-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("salt")}</p>
                  <p className="text-xs font-bold text-sky-500 tabular-nums">
                    {(analysisResult.nutrition.salt_g ?? 0).toFixed(1)}g
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {analysisResult.nutrition.dish_name && (
                  <span className="rounded border border-border px-2 py-0.5">
                    {analysisResult.nutrition.dish_name}
                  </span>
                )}
                {analysisResult.nutrition.source && (
                  <span className="rounded bg-muted px-2 py-0.5 uppercase">
                    {analysisResult.nutrition.source}
                  </span>
                )}
                {analysisResult.nutrition.serving_type && (
                  <span>{t("serving")}: {analysisResult.nutrition.serving_type}</span>
                )}
              </div>
            </div>
          )}

          {/* Accuracy notice */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
            {t("aiDisclaimer")}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {t("retake")}
            </button>
            <button
              onClick={proceedToForm}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label={t("confirmEdit")}
            >
              {t("confirmEdit")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Error ── */}
      {step === "error" && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-destructive" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("retry")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("analyzeError")}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button
              onClick={reset}
              className="flex-1 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {t("retry")}
            </button>
            <button
              onClick={() => router.push("/dashboard/meals/add")}
              className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {t("manualEntry")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
