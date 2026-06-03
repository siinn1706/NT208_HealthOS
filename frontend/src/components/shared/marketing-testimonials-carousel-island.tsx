"use client";

import { useEffect, useRef, useState } from "react";
import { TestimonialCard } from "@/components/shared/TestimonialCard";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types";

interface Props {
  testimonials: Testimonial[];
  scrollIndicatorLabel: string;
  goToLabel: string;
}

export function MarketingTestimonialsCarouselIsland({
  testimonials,
  scrollIndicatorLabel,
  goToLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const idxByEl = new Map<Element, number>();
    itemRefs.current.forEach((el, i) => { if (el) idxByEl.set(el, i); });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = idxByEl.get(e.target) ?? -1;
            if (i !== -1) setActiveIdx(i);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    itemRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
        >
          {testimonials.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              className="snap-start"
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent"
        />
      </div>
      <nav className="mt-4 flex justify-center gap-2" aria-label={scrollIndicatorLabel}>
        {testimonials.map((testimonial, idx) => (
          <button
            key={testimonial.id}
            type="button"
            aria-label={`${goToLabel} ${idx + 1}`}
            aria-current={activeIdx === idx ? "true" : undefined}
            onClick={() => {
              itemRefs.current[idx]?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
              });
            }}
            className={cn(
              "h-1.5 rounded-full transition-all",
              activeIdx === idx
                ? "w-6 bg-foreground"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
            )}
          />
        ))}
      </nav>
    </>
  );
}
