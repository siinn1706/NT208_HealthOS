"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AdherencePeriod = "7d" | "30d" | "90d";

interface AdherencePeriodTabsProps {
  value: AdherencePeriod;
  onChange: (period: AdherencePeriod) => void;
  labels: Record<AdherencePeriod, string>;
}

export function AdherencePeriodTabs({ value, onChange, labels }: AdherencePeriodTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as AdherencePeriod)}>
      <TabsList variant="line">
        <TabsTrigger value="7d">{labels["7d"]}</TabsTrigger>
        <TabsTrigger value="30d">{labels["30d"]}</TabsTrigger>
        <TabsTrigger value="90d">{labels["90d"]}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
