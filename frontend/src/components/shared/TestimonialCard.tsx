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
    <Card className="min-w-[320px] max-w-md border border-border/50 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-1 hover:shadow-lg hover:shadow-night-400/10 hover:border-night-400/20">
      <CardContent className="p-6">
        <div className="mb-4 text-3xl bg-gradient-to-r from-night-400 to-night-300 bg-clip-text text-transparent">&ldquo;&ldquo;</div>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground line-clamp-5">
          {quote}
        </p>
        <div className="text-3xl bg-gradient-to-r from-night-400 to-night-300 bg-clip-text text-transparent text-right">&rdquo;&rdquo;</div>
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
