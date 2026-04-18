"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaults,
        months: cn(defaults.months, "flex flex-col sm:flex-row gap-2"),
        month: cn(defaults.month, "flex flex-col gap-4"),
        month_caption: cn(
          defaults.month_caption,
          "grid grid-cols-[auto_1fr_auto] items-center gap-2 pt-1"
        ),
        caption_label: cn(defaults.caption_label, "text-sm font-medium text-center justify-self-center"),
        nav: cn(defaults.nav, "contents"),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 justify-self-start"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 justify-self-end"
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse space-y-1"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"
        ),
        week: cn(defaults.week, "flex w-full mt-2"),
        day: cn(
          defaults.day,
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100"
        ),
        range_start: cn(defaults.range_start, "day-range-start"),
        range_end: cn(defaults.range_end, "day-range-end"),
        selected: cn(
          defaults.selected,
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
        ),
        today: cn(defaults.today, "bg-accent text-accent-foreground rounded-md"),
        outside: cn(
          defaults.outside,
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground"
        ),
        disabled: cn(defaults.disabled, "text-muted-foreground opacity-40"),
        range_middle: cn(
          defaults.range_middle,
          "aria-selected:bg-accent aria-selected:text-accent-foreground"
        ),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
