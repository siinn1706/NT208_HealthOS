// Bilingual text type used across all data models
export type Locale = "vi" | "en";
export type BilingualText = { vi: string; en: string };

export interface Service {
  id: string;
  icon: string;
  title: BilingualText;
  description: BilingualText;
  cta: BilingualText;
  ctaLink: string;
}

export interface Plan {
  id: string;
  tierKey: "free" | "personal" | "family" | "pro";
  categoryId: string;
  name: BilingualText;
  price: number; // monthly price in VND (0 = free)
  description: BilingualText;
  features: BilingualText[];
  popular: boolean;
}

export interface Article {
  id: string;
  title: BilingualText;
  excerpt: BilingualText;
  author: string;
  date: string; // ISO date string
  categoryId: string;
  image: string;
}

export interface ArticleCategory {
  id: string;
  label: BilingualText;
}

export interface TeamMember {
  id: string;
  name: string;
  role: BilingualText;
  image: string;
}

export interface Testimonial {
  id: string;
  quote: BilingualText;
  author: string;
  role: string;
  image: string;
}

export interface FAQ {
  id: string;
  question: BilingualText;
  answer: BilingualText;
  categoryId: string;
}

export interface FAQCategory {
  id: string;
  label: BilingualText;
}

export interface NavLink {
  labelKey: string; // translation key used with useTranslations('nav')
  href: string;
}

export interface Stat {
  id: string;
  value: string;
  label: BilingualText;
}

/** Helper: pick the right locale text from a bilingual object */
export function pickLocale(text: BilingualText, locale: Locale): string {
  return text[locale];
}
