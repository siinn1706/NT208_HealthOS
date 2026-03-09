import { Camera } from "lucide-react";
import { Link } from "@/navigation";
import { CameraCapture } from "@/components/dashboard/meals/CameraCapture";

export default function MealSnapPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">Chụp ảnh bữa ăn</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI tự động nhận diện thành phần và tính toán dinh dưỡng
          </p>
        </div>
        <Link
          href="/dashboard/meals/add"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Nhập thủ công thay thế
        </Link>
      </div>

      {/* Camera/Upload capture component */}
      <CameraCapture />
    </div>
  );
}
