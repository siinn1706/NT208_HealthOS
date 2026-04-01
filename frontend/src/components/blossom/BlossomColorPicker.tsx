"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  BlossomColorPicker as BlossomCore,
  DEFAULT_COLORS,
  hexToHsl,
  lightnessToSliderValue,
  type BlossomColorPickerColor,
  type BlossomColorPickerValue,
  type ColorInput,
} from "@dayflow/blossom-color-picker";

export type BlossomPickerHex = `#${string}`;

export type BlossomColorPickerProps = {
  value: string | null;
  onChange: (hex: string) => void;
  disabled?: boolean;
  colors?: ColorInput[];
  className?: string;
};

function toCoreValue(hex: string): BlossomColorPickerValue {
  const { h, l } = hexToHsl(hex);
  // Core picker uses slider value for "saturation" field (0-100), mapped from lightness.
  return {
    hue: h,
    saturation: lightnessToSliderValue(l),
    alpha: 100,
    layer: "outer",
  };
}

export function BlossomColorPicker({ value, onChange, disabled, colors, className }: BlossomColorPickerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<BlossomCore | null>(null);

  const resolvedColors = useMemo(() => colors ?? (DEFAULT_COLORS as ColorInput[]), [colors]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    pickerRef.current = new BlossomCore(host, {
      colors: resolvedColors,
      disabled: disabled ?? false,
      ...(value ? { value: toCoreValue(value) } : {}),
      onChange: (c: BlossomColorPickerColor) => {
        if (disabled) return;
        if (c?.hex) onChange(c.hex.toLowerCase());
      },
    });

    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pickerRef.current?.setOptions({ disabled: disabled ?? false });
  }, [disabled]);

  useEffect(() => {
    pickerRef.current?.setOptions({ colors: resolvedColors });
  }, [resolvedColors]);

  useEffect(() => {
    if (!pickerRef.current) return;
    pickerRef.current.setOptions(value ? { value: toCoreValue(value) } : { value: undefined });
  }, [value]);

  return <div ref={hostRef} className={className} />;
}

