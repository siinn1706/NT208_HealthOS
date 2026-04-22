import React from "react";
import { StateView, type StateDensity } from "./StateView";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
  density?: StateDensity;
}

export function EmptyState({ title, body, action, density = "route" }: EmptyStateProps) {
  return (
    <StateView
      density={density}
      title={title}
      description={body}
      action={action}
    />
  );
}
