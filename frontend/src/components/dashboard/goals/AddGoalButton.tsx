"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GoalCreationWizard } from "@/components/dashboard/goals/GoalCreationWizard";

export function AddGoalButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("dashboard.goals");

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                size="sm"
                className="bg-[#1965B3] hover:bg-[#1965B3]/90"
                disabled
                aria-disabled
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{t("addGoal")}</span>
                <span className="sm:hidden">{t("addGoal")}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("addGoalDisabled")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <GoalCreationWizard
        open={open}
        onOpenChange={setOpen}
        onGoalCreated={(type, value, unit) => {
          console.log("New goal created:", { type, value, unit });
          // In V1: POST /api/v1/goals → Core BE
        }}
      />
    </>
  );
}
