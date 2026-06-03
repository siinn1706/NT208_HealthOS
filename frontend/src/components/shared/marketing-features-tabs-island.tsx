"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/shared/ServiceCard";
import type { Service } from "@/types";

interface FeaturesTab {
  id: string;
  label: string;
  services: Service[];
}

export function MarketingFeaturesTabsIsland({ tabs }: { tabs: FeaturesTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="mx-auto mb-10 flex max-w-full overflow-x-auto scrollbar-none gap-2 bg-background/50">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0 whitespace-nowrap">{tab.label}</TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tab.services.map((svc) => <ServiceCard key={svc.id} service={svc} />)}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
