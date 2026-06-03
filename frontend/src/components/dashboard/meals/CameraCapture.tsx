"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
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

import { sanitizePhotoForUpload } from "@/lib/photo-sanitizer";
import { ConfidenceChip } from "@/components/ui/confidence-chip";
import {
  DEFAULT_PORTION_OPTIONS,
  buildAnalysisResultFromMeal,
  buildSnapPrefillPayload,
  getAnalysisCalorieRange,
  getAnalysisTotalCalories,
  scaleAnalysisResultPortion,
  type AnalysisResult,
  type PortionValue,
} from "./camera-analysis-normalizer";

type AnalysisStep =
  | "idle"
  | "preview"
  | "analyzing"
  | "result"
  | "lowConfidence"
  | "unsupportedImage"
  | "failedHard"
  | "uploadedPending";

const SNAP_PREFILL_KEY = "meal_snap_prefill";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB — matches BFF + Core caps
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 50;            // ~100 s cap — AI inference can take 60-90 s on CPU
const SLOW_WARNING_AFTER_MS = 12_000;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

const STEP_MESSAGES_KEYS = [
  "Đang nhận diện thành phần...",
  "Ước lượng khẩu phần...",
  "Tính toán dinh dưỡng...",
  "Đang hoàn thiện kết quả...",
];

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new File([new Uint8Array(byteNumbers)], fileName, { type: mime });
}

export function CameraCapture() {
  const router = useRouter();
  const t = useTranslations("camera");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelledRef = useRef(false);
  // AbortController for the active poll fetch. Replaced at the start of every
  // analysis run and aborted on cancel/reset so that a cancel during a poll
  // interval never applies its result after the component has moved on.
  const pollAbortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<AnalysisStep>("idle");
  const [captureMode, setCaptureMode] = useState<"upload" | "camera" | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [processingMsg, setProcessingMsg] = useState(() => t("analyzing"));
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<PortionValue>("medium");

  const stopCameraStream = useCallback(() => {
    const stream = streamRef.current ?? (videoRef.current?.srcObject as MediaStream | null);
    stream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stop the live camera stream and abort any in-flight poll on unmount.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // ── Upload flow ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("fileTooLargeTitle"), { description: t("fileTooLargeBody") });
      e.target.value = "";
      return;
    }

    // Strip EXIF / PHI metadata before storing the preview data URL.
    // Canvas re-encode discards GPS, device serial, and capture timestamp.
    sanitizePhotoForUpload(file)
      .then((cleanBlob) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImageDataUrl(ev.target?.result as string);
          setStep("preview");
        };
        reader.readAsDataURL(cleanBlob);
      })
      .catch(() => {
        // Sanitizer failed (e.g. unsupported format) — fall back to raw file.
        // The unsupported-image terminal state will surface on analysis anyway.
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImageDataUrl(ev.target?.result as string);
          setStep("preview");
        };
        reader.readAsDataURL(file);
      });
  };

  // ── Camera flow ──────────────────────────────────────────────────
  const startCamera = async () => {
    setCaptureMode("camera");
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      } else {
        stopCameraStream();
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

    stopCameraStream();
    setStreamActive(false);
    setStep("preview");
  }, [stopCameraStream]);

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

      return buildAnalysisResultFromMeal(meal, imageDataUrl ?? null);
    },
    [imageDataUrl],
  );

  // ── Analysis ─────────────────────────────────────────────────────
  const startAnalysis = async () => {
    if (!imageDataUrl) return;
    cancelledRef.current = false;
    // Abort any previous poll and create a fresh controller for this run.
    pollAbortRef.current?.abort();
    pollAbortRef.current = new AbortController();
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
      // Capture the controller so closure captures the per-run instance.
      // If the user cancels mid-poll, pollAbortRef is nulled in reset(); the
      // AbortError thrown by the fetch is caught below and treated as a cancel.
      const pollController = pollAbortRef.current;
      // Server-side statuses are: pending → processing → analyzed | failed.
      // We must keep polling for both pending and processing, and bail out
      // immediately on failed so we don't burn 40s of polling on a known-bad job.
      while (
        !cancelledRef.current &&
        attempts < POLL_MAX_ATTEMPTS &&
        (jobStatus === "pending" || jobStatus === "processing")
      ) {
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Polling depends on the previous delayed status response.
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelledRef.current || pollController?.signal.aborted) break;
        // oxlint-disable-next-line react-doctor/async-await-in-loop -- Polling depends on the previous delayed status response.
        const pollRes = await fetch(`/api/v1/meals/analyze-photo/${jobId}`, {
          signal: pollController?.signal,
        });
        if (pollRes.ok) {
          const pollData = await pollRes.json().catch(() => null);
          if (typeof pollData?.status === "string") {
            jobStatus = pollData.status;
          }
        }
        attempts++;
      }

      // Treat an aborted poll the same as an explicit cancel — leave without
      // applying any result so the UI stays in whatever state reset() set it to.
      if (cancelledRef.current || pollController?.signal.aborted) return;

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
      setSelectedPortion("medium");
      const confidence = analyzed.confidence;
      if (typeof confidence === "number" && confidence < LOW_CONFIDENCE_THRESHOLD) {
        setStep("lowConfidence");
      } else {
        setStep("result");
      }
    } catch (err) {
      // AbortError from pollAbortRef.abort() is equivalent to a user cancel —
      // do not surface an error toast; the UI is already in a stable state.
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (!cancelledRef.current && !isAbort) {
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
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
    stopCameraStream();
    setStep("idle");
    setCaptureMode(null);
    setImageDataUrl(null);
    setStreamActive(false);
    setShowSlowWarning(false);
    setAnalysisResult(null);
    setSelectedPortion("medium");
    setProcessingMsg(t("analyzing"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Persist a slim prefill payload so AddMealForm can pick it up. The full
   * analysis result includes a base64 preview image that can exceed browser
   * storage quota, so the handoff must include editable nutrition fields only.
   */
  const proceedToForm = (opts: { needsReview?: boolean } = {}) => {
    if (analysisResult) {
      const selectedResult = scaleAnalysisResultPortion(analysisResult, selectedPortion);
      const payload = buildSnapPrefillPayload(selectedResult, {
        needsReview: opts.needsReview,
      });
      try {
        sessionStorage.setItem(SNAP_PREFILL_KEY, JSON.stringify(payload));
      } catch {
        // sessionStorage can throw in private mode / quota errors — degrade
        // gracefully: the form will just open empty.
      }
    }
    router.push("/dashboard/meals/add");
  };

  const displayedResult = analysisResult
    ? scaleAnalysisResultPortion(analysisResult, selectedPortion)
    : null;
  const totalCalories = getAnalysisTotalCalories(displayedResult);
  const calorieRange = getAnalysisCalorieRange(displayedResult);
  const portionOptions = analysisResult?.nutrition?.portion_options ?? DEFAULT_PORTION_OPTIONS;

  const confidenceValue = analysisResult?.confidence ?? null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload meal photo"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Step: Idle ── */}
      {step === "idle" && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 flex flex-col items-center gap-5 text-center">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Camera className="size-8 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t("aiSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button type="button"
              onClick={startCamera}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label={t("openCamera")}
            >
              <Camera className="size-6 text-primary" />
              <span className="text-xs font-medium text-foreground">{t("capture")}</span>
            </button>
            <button type="button"
              onClick={() => { setCaptureMode("upload"); fileInputRef.current?.click(); }}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label={t("upload")}
            >
              <Upload className="size-6 text-primary" />
              <span className="text-xs font-medium text-foreground">{t("upload")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Camera live view ── */}
      {step === "idle" && captureMode === "camera" && streamActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3]">
          <video
            ref={videoRef}
            className="size-full object-cover"
            playsInline
            muted
            aria-label={t("cameraPreview")}
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button type="button"
              onClick={captureFromCamera}
              className="size-14 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-105 transition-transform cursor-pointer active:scale-95"
              aria-label={t("capturePhoto")}
            />
            <button type="button"
              onClick={reset}
              className="absolute right-4 top-0 translate-y-0 size-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer"
              aria-label={t("cancelCamera")}
            >
              <X className="size-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === "preview" && imageDataUrl && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
            <Image
              src={imageDataUrl}
              alt={t("takenAlt")}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 32rem"
              className="size-full object-cover"
            />
            <button type="button"
              onClick={reset}
              className="absolute top-2 right-2 size-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              aria-label={t("deletePhoto")}
            >
              <X className="size-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={reset}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {t("retake")}
            </button>
            <button type="button"
              onClick={startAnalysis}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label={t("analyzeAria")}
            >
              <Sparkles className="size-4" />
              {t("analyze")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Analyzing ── */}
      {step === "analyzing" && (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center gap-5 text-center">
          <div className="relative size-16">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-8 text-primary" aria-hidden />
            </div>
          </div>
          {imageDataUrl && (
            <Image
              src={imageDataUrl}
              alt={t("analyzingAlt")}
              width={96}
              height={96}
              unoptimized
              className="size-24 rounded-xl object-cover border border-border opacity-60"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{t("analyzing")}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              {processingMsg}
            </p>
          </div>
          {showSlowWarning && (
            <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-left space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("slowWarning")}
              </p>
              <button type="button"
                onClick={() => {
                  cancelledRef.current = true;
                  pollAbortRef.current?.abort();
                  pollAbortRef.current = null;
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
      {(step === "result" || step === "lowConfidence") && analysisResult && displayedResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={
                  step === "lowConfidence"
                    ? "size-5 text-amber-500"
                    : "size-5 text-green-500"
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
              <Image
                src={imageDataUrl}
                alt={t("mealPhotoAlt")}
                width={56}
                height={56}
                unoptimized
                className="size-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{displayedResult.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("aiIdentified")}</p>
              </div>
              <div className="ml-auto text-right flex-shrink-0">
                <p className="text-base font-bold text-foreground">{calorieRange}</p>
                <p className="text-[10px] text-muted-foreground">kcal · ~{totalCalories}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Khẩu phần
            </p>
            <div className="grid grid-cols-3 gap-2">
              {portionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedPortion(option.value)}
                  className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                    selectedPortion === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("ingredientsFound", { n: analysisResult.ingredients.length })}
              </p>
            </div>
            {analysisResult.ingredients.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t("noInfo")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {displayedResult.ingredients.map((ing) => (
                  <li
                    key={`${ing.ingredient_name}-${ing.grams}-${ing.calories}`}
                    className="flex items-center justify-between px-4 py-3 gap-3"
                  >
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

          {displayedResult.nutrition && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("nutritionDetails")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-rose-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("saturates")}</p>
                  <p className="text-xs font-bold text-rose-500 tabular-nums">
                    {(displayedResult.nutrition.saturates_g ?? 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded-md bg-fuchsia-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("sugar")}</p>
                  <p className="text-xs font-bold text-fuchsia-500 tabular-nums">
                    {(displayedResult.nutrition.sugar_g ?? 0).toFixed(1)}g
                  </p>
                </div>
                <div className="rounded-md bg-sky-500/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("salt")}</p>
                  <p className="text-xs font-bold text-sky-500 tabular-nums">
                    {(displayedResult.nutrition.salt_g ?? 0).toFixed(1)}g
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {displayedResult.nutrition.dish_name && (
                  <span className="rounded border border-border px-2 py-0.5">
                    {displayedResult.nutrition.dish_name}
                  </span>
                )}
                {displayedResult.nutrition.source && (
                  <span className="rounded bg-muted px-2 py-0.5 uppercase">
                    {displayedResult.nutrition.source}
                  </span>
                )}
                {displayedResult.nutrition.serving_type && (
                  <span>{t("serving")}: {displayedResult.nutrition.serving_type}</span>
                )}
              </div>
              {(displayedResult.nutrition.warnings ?? []).length > 0 && (
                <ul className="space-y-1 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                  {displayedResult.nutrition.warnings?.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Accuracy notice */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
            {t("aiDisclaimer")}
          </p>

          <div className="flex items-center gap-3">
            <button type="button"
              onClick={reset}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="size-4" />
              {t("retake")}
            </button>
            <button type="button"
              onClick={() => proceedToForm({ needsReview: step === "lowConfidence" })}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label={t("confirmEdit")}
            >
              {t("confirmEdit")}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Unsupported image ── */}
      {step === "unsupportedImage" && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="size-7 text-amber-500" aria-hidden />
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
            <button type="button"
              onClick={reset}
              className="flex-1 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {t("retry")}
            </button>
            <button type="button"
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
          <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="size-7 text-destructive" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("retry")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("analyzeError")}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button type="button"
              onClick={reset}
              className="flex-1 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              {t("retry")}
            </button>
            <button type="button"
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
