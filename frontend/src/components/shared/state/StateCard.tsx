"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StateView, type StateViewProps } from "./StateView";

export interface StateCardProps
  extends Omit<StateViewProps, "title" | "description" | "density"> {
  cardTitle?: React.ReactNode;
  cardSubtitle?: React.ReactNode;
  emptyTitle: React.ReactNode;
  emptyDescription?: React.ReactNode;
  contentClassName?: string;
}

/**
 * Section-level container that pairs a Card chrome with a StateView body.
 * Use for empty/error/permission/offline states inside dashboard widgets.
 */
export function StateCard({
  cardTitle,
  cardSubtitle,
  emptyTitle,
  emptyDescription,
  className,
  contentClassName,
  kind,
  icon,
  primaryAction,
  secondaryAction,
}: StateCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(cardTitle || cardSubtitle) && (
        <CardHeader className="space-y-1">
          {cardTitle && <CardTitle className="text-base">{cardTitle}</CardTitle>}
          {cardSubtitle && (
            <p className="text-xs text-muted-foreground">{cardSubtitle}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={cn("p-4", contentClassName)}>
        <StateView
          kind={kind}
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          density="section"
        />
      </CardContent>
    </Card>
  );
}
