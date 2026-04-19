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
    <Card className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:border-night-400/40 hover:shadow-md">
      <CardContent className="flex h-full flex-col items-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-night-100 to-white shadow-inner border border-night-200 dark:from-night-800 dark:to-night-700 dark:border-night-600/50 text-night-700 transition-transform group-hover:scale-105">
          <Image
            src={service.icon}
            alt=""
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
          data-event="service-cta-click"
          data-event-service-id={service.id}
          className="mt-auto inline-flex items-center text-sm font-semibold bg-gradient-to-r from-night-700 to-night-400 bg-clip-text text-transparent transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 rounded-sm"
        >
          {cta}
          <ChevronRight className="ml-1 h-4 w-4 text-night-700 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
