"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * App-level error boundary for the authenticated (app) layout segment.
 * Catches unhandled errors in any dashboard route and shows a recovery UI
 * instead of a white screen crash.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[AppError] unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-destructive/70" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Đã xảy ra lỗi</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Có lỗi không mong muốn. Vui lòng thử lại hoặc tải lại trang.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">ID: {error.digest}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Thử lại
      </Button>
    </div>
  );
}
