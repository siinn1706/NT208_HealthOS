"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Server resolves locale before passing — all strings are plain text here.
export interface FaqItemResolved {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
}

export interface FaqCategoryResolved {
  id: string;
  label: string;
}

interface Props {
  faqs: FaqItemResolved[];
  faqCategories: FaqCategoryResolved[];
  badge: string;
  title: string;
  subtitle: string;
}

export function MarketingAboutFaqIsland({ faqs, faqCategories, badge, title, subtitle }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const filtered = activeCategory === "all" ? faqs : faqs.filter((f) => f.categoryId === activeCategory);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Badge className="mb-2 border-0 bg-gradient-to-r from-night-700/15 to-night-400/15 text-night-700 dark:text-night-300">
          {badge}
        </Badge>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {faqCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            aria-pressed={activeCategory === cat.id}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-night-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeCategory === cat.id
                ? "bg-primary text-white"
                : "border border-border bg-transparent text-muted-foreground hover:border-night-400 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <Accordion type="single" collapsible className="w-full">
        {filtered.map((faq, i) => (
          <AccordionItem key={faq.id} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm font-semibold">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
