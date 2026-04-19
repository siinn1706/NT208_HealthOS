"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

import { ConfidenceChip } from "@/components/ui/confidence-chip";

/**
 * Meals Snap & Analyse — see UX plan §I (Meals AI flow).
 *
 * State machine (simplified for what's currently wired up):
 *   idle → preview → analyzing → (result | lowConfidence | failedHard | unsupportedImage)
 *
 * Notes:
 * - The image upload limit is 10 MiB to match the BFF multipart cap and Core's
 *   own validator (`backend/app/api/v1/endpoints/meals.py::analyze_meal_photo`).
 * - The polling loop must also tolerate `pending` (initial state) and
 *   short-circuit on `failed` — earlier versions only handled `processing`,
 *   so jobs that flipped to `failed` would silently look like a timeout to the
 *   user. (UX plan §C, P0 truth-and-safety fix.)
 * - When the result confidence is below 0.6 we land in `lowConfidence` and
 *   mark the prefill so AddMealForm shows the "review carefully" banner.
 */

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
  confidence: number | null;
  imageDataUrl?: string | null;
}

type AnalysisStep =
  | "idle"
  | "preview"
  | "analyzing"
  | "result"
  | "lowConfidence"
  | "unsupportedImage"
  | "failedHard";

const SNAP_PREFILL_KEY = "meal_snap_prefill";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB — matches BFF + Core caps
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 20;            // ~40 s cap
const SLOW_WARNING_AFTER_MS = 12_000;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

const STEP_MESSAGES_KEYS = [
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
  const cancelledRef = useRef(false);

  const [step, setStep] = useState<AnalysisStep>("idle");
  const [captureMode, setCaptureMode] = useState<"upload" | "camera" | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [processingMsg, setProcessingMsg] = useState(t("analyzing"));
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Stop the live camera stream on unmount to avoid leaking the device handle.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // ── Upload flow ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("fileTooLargeTitle"), { description: t("fileTooLargeBody") });
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
      // Camera permission denied or unavailable — fall back to upload.
      // (UX plan §I `permissionDenied` state would render a richer banner;
      // for now we silently degrade so the user can still log a meal.)
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

    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    setStreamActive(false);
    setStep("preview");
  }, []);

  const dataUrlToFile = (dataUrl: string, fileName: string): File => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new File([new Uint8Array(byteNumbers)], fileName, { type: mime });
  };

  /**
   * Once the job resolves (`analyzed`) we still need the parsed payload —
   * which lives on the Meal record itself. We page through the recent
   * meals to find the one tagged with this `job_id` and unpack it into
   * the shape <AnalysisResult> uses.
   */
  const fetchAnalyzedMealByJob = useCallback(
    async (jobId: string): Promise<AnalysisResult | null> => {
      const res = await fetch("/api/v1/meals?page=1&per_page=100", {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      const list = Array.isArray(json?.data) ? json.data : [];
      const meal = list.find(
        (item: Record<string, unknown>) => item?.job_id === jobId,
      );
      if (!meal) return null;

      const nutrition = (meal.nutrition_result ?? null) as
        | {
            calories?: number | null;
            confidence?: number | null;
          }
        | null;

      const rawIngredients = Array.isArray(
        (meal as { ingredients?: unknown }).ingredients,
      )
        ? ((meal as { ingredients: unknown[] }).ingredients as Array<
            Record<string, unknown>
          >)
        : [];

      const ingredients: AnalysisIngredient[] = rawIngredients.map((ing) => ({
        ingredient_name: typeof ing.ingredient_name === "string"
          ? ing.ingredient_name
          : "",
        grams: typeof ing.grams === "number" ? ing.grams : 0,
        calories: typeof ing.calories === "number" ? ing.calories : 0,
        protein_g: typeof ing.protein_g === "number" ? ing.protein_g : 0,
        carbs_g: typeof ing.carbs_g === "number" ? ing.carbs_g : 0,
        fat_g: typeof ing.fat_g === "number" ? ing.fat_g : 0,
      }));

      return {
        name: typeof meal.name === "string" ? meal.name : "",
        meal_type: "lunch",
        ingredients,
        estimatedCalories:
          typeof nutrition?.calories === "number" ? nutrition.calories : null,
        confidence:
          typeof nutrition?.confidence === "number"
            ? nutrition.confidence
            : null,
        imageDataUrl: imageDataUrl ?? null,
      };
    },
    [imageDataUrl],
  );

  // ── Analysis ─────────────────────────────────────────────────────
  const startAnalysis = async () => {
    if (!imageDataUrl) return;
    cancelledRef.current = false;
    setShowSlowWarning(false);
    setStep("analyzing");

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % STEP_MESSAGES_KEYS.length;
      setProcessingMsg(STEP_MESSAGES_KEYS[msgIdx]);
    }, 900);

    const slowWarningTimer = window.setTimeout(() => {
      setShowSlowWarning(true);
    }, SLOW_WARNING_AFTER_MS);

    try {
      const file = dataUrlToFile(imageDataUrl, "meal.jpg");

      // B7 P7 — if offline, persist the photo in IndexedDB and surface a
      // "queued" terminal state so the user can navigate away. The queue
      // flushes automatically when the connection recovers.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        try {
          const { enqueueMultipart } = await import("@/lib/offline-queue-multipart");
          await enqueueMultipart({
            url: "/api/v1/meals/analyze-photo",
            method: "POST",
            label: "meal-photo",
            fields: [{ name: "image", value: file, filename: "meal.jpg" }],
          });
          clearInterval(interval);
          window.clearTimeout(slowWarningTimer);
          toast.success(t("queuedOfflineTitle"), { description: t("queuedOfflineBody") });
          setStep("uploadedPending");
          return;
        } catch {
          // Fall through to the live network attempt — we'd rather try than swallow.
        }
      }

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/v1/meals/analyze-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Map well-known upstream errors onto the proper terminal states so the
        // user sees the right copy + recovery action (UX plan §I).
        if (res.status === 415 || res.status === 422) {
          setStep("unsupportedImage");
          toast.error(t("unsupportedImageTitle"), {
            description: t("unsupportedImageBody"),
          });
          return;
        }
        if (res.status === 413) {
          setStep("failedHard");
          toast.error(t("fileTooLargeTitle"), {
            description: t("fileTooLargeBody"),
          });
          return;
        }
        setStep("failedHard");
        toast.error(t("uploadFailedTitle"), {
          description: t("uploadFailedBody"),
        });
        return;
      }

      const startData = await res.json().catch(() => null);
      const jobId = typeof startData?.job_id === "string" ? startData.job_id : "";
      let jobStatus = typeof startData?.status === "string"
        ? startData.status
        : "pending";
      if (!jobId) {
        setStep("failedHard");
        return;
      }

      let attempts = 0;
      // Server-side statuses are: pending → processing → analyzed | failed.
      // We must keep polling for both pending and processing, and bail out
      // immediately on failed so we don't burn 40s of polling on a known-bad job.
      while (
        !cancelledRef.current &&
        attempts < POLL_MAX_ATTEMPTS &&
        (jobStatus === "pending" || jobStatus === "processing")
      ) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const pollRes = await fetch(`/api/v1/meals/analyze-photo/${jobId}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json().catch(() => null);
          if (typeof pollData?.status === "string") {
            jobStatus = pollData.status;
          }
        }
        attempts++;
      }

      if (cancelledRef.current) return;

      if (jobStatus === "failed") {
        setStep("failedHard");
        return;
      }

      if (jobStatus !== "analyzed") {
        // Timed out without resolving — same recovery copy as a hard failure.
        setStep("failedHard");
        return;
      }

      const analyzed = await fetchAnalyzedMealByJob(jobId);
      if (!analyzed) {
        setStep("failedHard");
        return;
      }

      setAnalysisResult(analyzed);
      const confidence = analyzed.confidence;
      if (typeof confidence === "number" && confidence < LOW_CONFIDENCE_THRESHOLD) {
        setStep("lowConfidence");
      } else {
        setStep("result");
      }
    } catch {
      if (!cancelledRef.current) {
        setStep("failedHard");
        toast.error(t("uploadFailedTitle"), {
          description: t("uploadFailedBody"),
        });
      }
    } finally {
      clearInterval(interval);
      window.clearTimeout(slowWarningTimer);
    }
  };

  const reset = () => {
    cancelledRef.current = true;
    setStep("idle");
    setCaptureMode(null);
    setImageDataUrl(null);
    setStreamActive(false);
    setShowSlowWarning(false);
    setAnalysisResult(null);
    setProcessingMsg(t("analyzing"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Persist the prefill payload so AddMealForm can pick it up. We store both
   * the AI fields and the original photo data URL, plus a `needs_review` flag
   * for the low-confidence path so the form can show its own banner.
   */
  const proceedToForm = (opts: { needsReview?: boolean } = {}) => {
    if (analysisResult) {
      const payload = {
        ...analysisResult,
        needs_review: opts.needsReview === true,
        captured_at: new Date().toISOString(),
      };
      try {
        sessionStorage.setItem(SNAP_PREFILL_KEY, JSON.stringify(payload));
      } catch {
        // sessionStorage can throw in private mode / quota errors — degrade
        // gracefully: the form will just open empty.
      }
    }
    router.push("/dashboard/meals/add");
  };

  const totalCalories =
    analysisResult?.ingredients.reduce((sum, i) => sum + i.calories, 0) ??
    analysisResult?.estimatedCalories ??
    0;

  const confidenceValue = analysisResult?.confidence ?? null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
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
            aria-label={t("cameraPreview")}
          />
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
          {showSlowWarning && (
            <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-left space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("slowWarning")}
              </p>
              <button
                onClick={() => {
                  cancelledRef.current = true;
                  router.push("/dashboard/meals/add");
                }}
                className="text-xs font-medium text-amber-700 dark:text-amber-300 underline cursor-pointer"
              >
                {t("skipToManual")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Result / LowConfidence ── */}
      {(step === "result" || step === "lowConfidence") && analysisResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={
                  step === "lowConfidence"
                    ? "w-5 h-5 text-amber-500"
                    : "w-5 h-5 text-green-500"
                }
              />
              <p className="text-sm font-semibold text-foreground">
                {step === "lowConfidence"
                  ? t("lowConfidenceTitle")
                  : t("analyzeComplete")}
              </p>
            </div>
            <ConfidenceChip value={confidenceValue} showValue />
          </div>

          {step === "lowConfidence" && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-200">
              {t("lowConfidenceBody")}
            </div>
          )}

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

          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
            {t("aiDisclaimer")}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {t("retake")}
            </button>
            <button
              onClick={() => proceedToForm({ needsReview: step === "lowConfidence" })}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label={t("confirmEdit")}
            >
              {t("confirmEdit")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Unsupported image ── */}
      {step === "unsupportedImage" && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("unsupportedImageTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("unsupportedImageBody")}
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

      {/* ── Step: failedHard ── */}
      {step === "failedHard" && (
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
