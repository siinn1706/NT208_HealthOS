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
        <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-gradient-to-tr from-night-100 to-white shadow-inner border border-night-200 dark:from-night-800 dark:to-night-700 dark:border-night-600/50 text-night-700 transition-transform group-hover:scale-105">
          <Image
            src={service.icon}
            alt=""
            width={28}
            height={28}
            className="size-7"
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
          className="mt-auto inline-flex items-center rounded-sm text-sm font-semibold text-night-700 transition-colors duration-150 ease-out hover:text-night-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 dark:text-night-300 dark:hover:text-night-200"
        >
          {cta}
          <ChevronRight className="ml-1 size-4 text-night-700 transition-transform group-hover:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  );
}
