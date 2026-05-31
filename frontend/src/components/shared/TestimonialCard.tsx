"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import type { Testimonial, Locale } from "@/types";
import { pickLocale } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const locale = useLocale() as Locale;
  const quote = pickLocale(testimonial.quote, locale);

  return (
    <Card className="h-full min-w-[320px] max-w-md rounded-2xl border border-border/60 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:border-night-400/40 hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 text-3xl text-night-400">&ldquo;</div>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground line-clamp-5">
          {quote}
        </p>
        <div className="text-right text-3xl text-night-400">&rdquo;</div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <Image
            src={testimonial.image}
            alt={testimonial.author}
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
