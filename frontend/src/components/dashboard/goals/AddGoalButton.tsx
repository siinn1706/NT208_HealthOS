"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoalCreationWizard } from "@/components/dashboard/goals/GoalCreationWizard";

export function AddGoalButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        className="bg-[#1965B3] hover:bg-[#1965B3]/90"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4 mr-1.5" />
        <span className="hidden sm:inline">Thêm mục tiêu</span>
        <span className="sm:hidden">Thêm</span>
      </Button>

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
