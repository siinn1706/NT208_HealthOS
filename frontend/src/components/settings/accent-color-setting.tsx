"use client";

import { useState, useCallback } from "react";
import BlossomColorPicker, { hexToHsl } from "@dayflow/blossom-color-picker-react";
import type { BlossomColorPickerColor, BlossomColorPickerValue } from "@dayflow/blossom-color-picker-react";
import "@dayflow/blossom-color-picker/styles.css";
import { useTranslations } from "next-intl";
import { RotateCcw, Save } from "lucide-react";
import { useAccentColor } from "@/components/providers/accent-color-provider";
import { AccentPreviewCard } from "./accent-preview-card";
import { cn } from "@/lib/utils";

// The original shipped default (light-mode base hue).
// deriveAccentTokens adjusts contrast/lightness for dark mode automatically.
const DEFAULT_APP_ACCENT = "#1965B3";

function hexToBlossomValue(hex: string): BlossomColorPickerValue {
  const { h, s, l } = hexToHsl(hex);
  return { hue: h, saturation: s, lightness: l, alpha: 100, layer: "outer" };
}

export function AccentColorSetting() {
  const t = useTranslations("dashboard.settingsPage.appearance");
  // applyAccent is intentionally NOT destructured here — pending picks must NOT
  // touch global CSS variables until the user explicitly presses Save.
  const { accentColor, setAccentColor } = useAccentColor();

  // Full Blossom color object from onChange — zero roundtrip while user is picking.
  // null = no unsaved change (use saved accent as starting point).
  const [pendingColor, setPendingColor] = useState<BlossomColorPickerColor | null>(null);
  // Explicit hex override used only by Reset — gives the picker a fresh start at a
  // known hex without any prior pendingColor state.
  const [forceHex, setForceHex] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // What color the preview and save action currently reflect.
  const displayHex = pendingColor
    ? `#${pendingColor.hex.replace("#", "").slice(0, 6).toUpperCase()}`
    : (forceHex ?? accentColor ?? DEFAULT_APP_ACCENT);

  // Value passed into the picker.
  // When pendingColor is set: pass it back directly (BlossomColorPickerColor extends
  // BlossomColorPickerValue) — arc slider stays fully in sync, no roundtrip.
  // Otherwise: derive from hex (fresh start from saved/default/reset hex).
  const blossomValue: BlossomColorPickerValue = pendingColor ?? hexToBlossomValue(displayHex);

  const savedHex = (accentColor ?? DEFAULT_APP_ACCENT).toUpperCase();
  // Dirty: user has a pending pick or a pending reset that differs from what's saved.
  const isDirty = (pendingColor !== null || forceHex !== null)
    && displayHex.toUpperCase() !== savedHex;

  // Reset button: display value is not the original app default.
  const canReset = displayHex.toUpperCase() !== DEFAULT_APP_ACCENT.toUpperCase();

  const showActionBar = isDirty || saveStatus !== "idle" || canReset;

  // Store the FULL color object from Blossom — hue, saturation, lightness, alpha, layer
  // are all preserved. Arc slider stays in sync because value is fed back unchanged.
  const handlePickerChange = useCallback((color: BlossomColorPickerColor) => {
    setPendingColor(color);
    setForceHex(null);
    setSaveStatus("idle");
  }, []);

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/preferences/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent_color: displayHex }),
      });
      if (!res.ok) throw new Error("Save failed");
      // setAccentColor persists the value AND triggers applyAccent via provider effect.
      setAccentColor(displayHex);
      localStorage.setItem("healthos-accent", displayHex);
      setPendingColor(null);
      setForceHex(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset: clear active pending pick and force-start the picker from the original default.
  // The live app theme does NOT change until the user explicitly presses Save.
  const handleReset = useCallback(() => {
    setPendingColor(null);
    setForceHex(DEFAULT_APP_ACCENT);
    setSaveStatus("idle");
  }, []);

  return (
    <div className="space-y-3 w-full">
      {/* Two-column: preview LEFT, BlossomColorPicker RIGHT */}
      <div className="flex gap-4 items-start">
        {/* LEFT: scoped preview — compact fixed width so it doesn't stretch across the row */}
        <div className="flex-none w-100">
          <AccentPreviewCard accentHex={displayHex} />
        </div>

        {/* RIGHT: dedicated picker zone — flex-1 fills remaining space,
            picker centered so it sits in the middle of the open area */}
        <div className="flex-1 flex justify-center items-start">
          <BlossomColorPicker
            value={blossomValue}
            onChange={handlePickerChange}
            sliderPosition="right"
            adaptivePositioning={false}
            sliderOffset={20}
          />
        </div>
      </div>

      {/* Action bar — save, reset, and feedback */}
      {showActionBar && (
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                saveStatus === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
                isSaving && "opacity-60 cursor-not-allowed",
              )}
            >
              <Save className="w-3.5 h-3.5" />
              {saveStatus === "error" ? t("accentSaveFailed") : t("saveAccent")}
            </button>
          )}
          {!isDirty && saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
              <Save className="w-3.5 h-3.5" />
              {t("accentSaved")}
            </span>
          )}
          {canReset && (
            <button
              onClick={handleReset}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors cursor-pointer",
                isSaving && "opacity-60 cursor-not-allowed",
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("resetDefault")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AccentColorSetting;
