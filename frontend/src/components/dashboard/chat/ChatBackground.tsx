"use client";

/**
 * ChatBackground — renders the chat window background per theme type:
 *
 * • pattern (SVG 375×812 portrait)  → background-repeat: repeat  (lặp tile liên tục)
 * • gradient (PNG 375×812 portrait) → <img> element, xoay 90° khi container landscape
 *   để ảnh phủ đầy chiều rộng chat mà không bị scale quá nhiều
 */

import { useEffect, useRef, useState } from "react";
import type { ChatTheme } from "@/types/api";

interface ChatBackgroundProps {
  theme: ChatTheme | undefined;
}

export function ChatBackground({ theme }: ChatBackgroundProps) {
  if (!theme) return null;

  if (theme.type === "pattern") {
    return <PatternBackground url={theme.url} />;
  }

  return <GradientBackground url={theme.url} />;
}

// ─── Pattern SVG: repeat tile ────────────────────────────────────────────────

function PatternBackground({ url }: { url: string }) {
  return (
    <>
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${url})`,
          backgroundRepeat: "repeat",
          backgroundSize: "375px 812px", // native SVG canvas size, tile naturally
        }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none bg-background/40" />
    </>
  );
}

// ─── Gradient PNG: xoay 90° khi container landscape ─────────────────────────

function GradientBackground({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rotate, setRotate] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /**
   * Quyết định có cần xoay không bằng cách so sánh:
   *  - naturalWidth/naturalHeight của ảnh (portrait = H > W)
   *  - offsetWidth/offsetHeight của container (landscape = W > H, thường gặp desktop)
   *
   * Nếu ảnh portrait VÀ container landscape → xoay 90° + scale để phủ đầy.
   */
  function checkRotation() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;

    const imgIsPortrait = img.naturalHeight > img.naturalWidth * 1.2;
    const containerIsLandscape = container.offsetWidth > container.offsetHeight * 1.1;

    setRotate(imgIsPortrait && containerIsLandscape);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Re-check when container is resized (e.g., sidebar toggle)
    const ro = new ResizeObserver(checkRotation);
    ro.observe(container);
    return () => ro.disconnect();
  }, [loaded]);

  /**
   * Khi xoay 90°: chiều rộng ảnh sau xoay = chiều cao container, cần scale
   * để chiều dài ảnh (sau xoay = chiều rộng gốc) pass vừa chiều rộng container.
   *
   * Scale factor = containerWidth / imgNaturalHeight  (vì sau khi xoay,
   * chiều "cao" của ảnh là naturalWidth, chiều "rộng" là naturalHeight).
   * Ta muốn naturalHeight * scale ≥ containerWidth.
   * → scale = containerWidth / naturalHeight  (cover theo chiều rộng)
   * Thêm nhỏ 5% để đảm bảo không hở mép.
   */
  function getRotateStyle(): React.CSSProperties {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return {};

    const containerW = container.offsetWidth;
    const containerH = container.offsetHeight;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // After 90° rotation: rendered width = imgH, rendered height = imgW (in layout space)
    // We want rendered width (imgH * scale) >= containerW  AND rendered height (imgW * scale) >= containerH
    const scaleW = containerW / imgH;
    const scaleH = containerH / imgW;
    const scale = Math.max(scaleW, scaleH) * 1.02; // 2% buffer

    return {
      transform: `rotate(90deg) scale(${scale})`,
      transformOrigin: "center center",
      width: `${imgH}px`,  // pre-rotation dimensions
      height: `${imgW}px`,
    };
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt=""
        aria-hidden
        onLoad={() => {
          setLoaded(true);
          checkRotation();
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none"
        style={
          rotate
            ? getRotateStyle()
            : {
                // No rotation: standard cover
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }
        }
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/55 pointer-events-none" />
    </div>
  );
}
