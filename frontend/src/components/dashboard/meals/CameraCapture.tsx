"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "@/navigation";
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
import { cn } from "@/lib/utils";

// POST /api/v1/meals/analyze-photo
// Trigger: user submits a captured/uploaded image
// Request: FormData { name: string, image: File }
// Response: { job_id: string, status: string }
//
// GET /api/v1/meals/analyze-photo/:job_id
// Trigger: polling after photo submission (every 2s up to 30s)
// Response: { job_id: string, status: string }

// Mock result returned when BFF isn't available
const MOCK_ANALYSIS_RESULT = {
  name: "Cơm gà xối mỡ",
  meal_type: "lunch" as const,
  ingredients: [
    { ingredient_name: "Cơm trắng (đã nấu)", grams: 250, calories: 325, protein_g: 6.8, carbs_g: 71.5, fat_g: 0.8 },
    { ingredient_name: "Thịt gà (đùi, da, chiên)", grams: 180, calories: 432, protein_g: 36.2, carbs_g: 2.4, fat_g: 29.9 },
    { ingredient_name: "Dưa leo", grams: 60, calories: 8, protein_g: 0.5, carbs_g: 1.5, fat_g: 0.1 },
    { ingredient_name: "Cà chua bi", grams: 50, calories: 9, protein_g: 0.4, carbs_g: 1.6, fat_g: 0.1 },
  ],
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<AnalysisStep>("idle");
  const [captureMode, setCaptureMode] = useState<"upload" | "camera" | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [processingMsg, setProcessingMsg] = useState(STEP_MESSAGES[0]);
  const [analysisResult, setAnalysisResult] = useState<typeof MOCK_ANALYSIS_RESULT | null>(null);

  // ── Upload flow ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      const { job_id, status } = await res.json();

      // Poll for job completion
      const maxRetries = 15; // 30 seconds total
      let retries = 0;
      let jobStatus = status;

      while (retries < maxRetries && jobStatus === "processing") {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`/api/v1/meals/analyze-photo/${job_id}`);
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          jobStatus = pollData.status;
        }
        retries++;
      }

      if (jobStatus === "analyzed" || jobStatus === "done") {
        // Get the meal with nutrition data - for now use mock
        // In production, fetch the meal details
        setAnalysisResult(MOCK_ANALYSIS_RESULT);
      } else {
        // Fallback to mock for demo
        setAnalysisResult(MOCK_ANALYSIS_RESULT);
      }
      setStep("result");
    } catch {
      // Fallback to mock for demo
      setAnalysisResult(MOCK_ANALYSIS_RESULT);
      setStep("result");
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
    analysisResult?.ingredients.reduce((sum, i) => sum + i.calories, 0) ?? 0;

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
            <h2 className="text-base font-semibold text-foreground">Chụp hoặc tải ảnh bữa ăn</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              AI sẽ nhận diện thành phần và ước lượng dinh dưỡng tự động
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button
              onClick={startCamera}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label="Mở camera"
            >
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-foreground">Chụp ảnh</span>
            </button>
            <button
              onClick={() => { setCaptureMode("upload"); fileInputRef.current?.click(); }}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-border bg-background hover:bg-muted p-4 transition-colors cursor-pointer"
              aria-label="Tải ảnh lên"
            >
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-foreground">Tải ảnh</span>
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
              aria-label="Chụp ảnh"
            />
            <button
              onClick={reset}
              className="absolute right-4 top-0 translate-y-0 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer"
              aria-label="Hủy camera"
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
              alt="Ảnh bữa ăn đã chụp"
              className="w-full h-full object-cover"
            />
            <button
              onClick={reset}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="Xóa ảnh"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Chụp lại
            </button>
            <button
              onClick={startAnalysis}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Phân tích bữa ăn bằng AI"
            >
              <Sparkles className="w-4 h-4" />
              Phân tích AI
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
              alt="Đang phân tích"
              className="w-24 h-24 rounded-xl object-cover border border-border opacity-60"
            />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">Đang phân tích ảnh...</p>
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
              Phân tích xong! Kiểm tra và xác nhận kết quả.
            </p>
          </div>

          {/* Preview thumbnail */}
          {imageDataUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="Ảnh bữa ăn"
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{analysisResult.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI nhận diện tự động</p>
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
                Thành phần nhận diện ({analysisResult.ingredients.length})
              </p>
            </div>
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
          </div>

          {/* Accuracy notice */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
            AI có thể không chính xác 100%. Bạn có thể chỉnh sửa thành phần trong bước tiếp theo.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Chụp lại
            </button>
            <button
              onClick={proceedToForm}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Tiếp tục chỉnh sửa trong form thêm bữa ăn"
            >
              Xác nhận & chỉnh sửa
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
            <p className="text-sm font-semibold text-foreground">Phân tích thất bại</p>
            <p className="text-xs text-muted-foreground mt-1">
              Không thể phân tích ảnh. Vui lòng thử lại hoặc nhập thủ công.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button
              onClick={reset}
              className="flex-1 h-9 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Thử lại
            </button>
            <button
              onClick={() => router.push("/dashboard/meals/add")}
              className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Nhập thủ công
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
