"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { pickLocale } from "@/types";
import type { Service, Locale } from "@/types";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const locale = useLocale() as Locale;
  const title = pickLocale(service.title, locale);
  const description = pickLocale(service.description, locale);
  const cta = pickLocale(service.cta, locale);

  return (
    <Card className="group relative overflow-hidden border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-night-400/10 hover:border-night-400/20">
      <CardContent className="flex flex-col items-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-night-100 to-white shadow-inner border border-night-200 dark:from-night-800 dark:to-night-700 dark:border-night-600/50 text-night-700 transition-transform group-hover:scale-110">
          <Image
            src={service.icon}
            alt={title}
            width={28}
            height={28}
            className="h-7 w-7"
          />
        </div>
        <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {description}
        </p>
        <Link
          href={service.ctaLink}
          className="inline-flex items-center text-sm font-semibold bg-gradient-to-r from-night-700 to-night-400 bg-clip-text text-transparent transition-all hover:from-night-600 hover:to-night-300"
        >
          {cta}
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
      {/* Gradient bottom bar expanding on hover */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-night-400 to-night-300 scale-x-0 transition-transform duration-300 origin-left group-hover:scale-x-100" />
    </Card>
  );
}
