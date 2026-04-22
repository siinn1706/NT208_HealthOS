"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface RevealProps {
  children: ReactNode;
  /** Pixels of vertical offset for the entrance — default 16. */
  y?: number;
  /** Animation duration in seconds — default 0.5. */
  duration?: number;
  /** Stagger delay in seconds — default 0. */
  delay?: number;
  /** Replays the animation each time the element re-enters the viewport. */
  once?: boolean;
  className?: string;
}

/**
 * Lightweight scroll-reveal wrapper.
 *
 * - Animates opacity + small translateY when the element scrolls into view.
 * - Honors `prefers-reduced-motion`: degrades to a no-op render.
 * - Motion runs only after mount so SSR HTML matches the first client paint (no hydration mismatch).
 * - Wraps in a single motion.div; suitable for sections, cards, headings.
 * - Keep usage selective — over-reveal is more distracting than helpful.
 */
export function Reveal({
  children,
  y = 16,
  duration = 0.5,
  delay = 0,
  once = true,
  className,
}: RevealProps) {
  const [mounted, setMounted] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  /** SSR + first client paint: static div so HTML matches (no motion inline styles). */
  if (!mounted || prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
