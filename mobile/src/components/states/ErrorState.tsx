import React from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n";
import { ApiError } from "@/api/errors";
import { StateView, type StateDensity } from "./StateView";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  density?: StateDensity;
}

export function ErrorState({ error, onRetry, title, density = "route" }: ErrorStateProps) {
  const t = useT();
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  const code = error instanceof ApiError ? error.code : undefined;
  const desc =
    code && code !== message ? `${message}\n${code}` : message;
  return (
    <StateView
      density={density}
      title={title ?? t("common.errorTitle")}
      description={desc}
      action={
        onRetry ? (
          <Button onPress={onRetry}>{t("common.errorRetry")}</Button>
        ) : undefined
      }
    />
  );
}
