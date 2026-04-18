/**
 * Centralized locale-aware formatting utilities.
 * Use these instead of hardcoding "vi-VN" / "en-US" throughout the app.
 * All functions accept a `locale` string: "vi" | "en" (or any BCP-47 tag).
 */

// ─── Locale tag mapping ──────────────────────────────────────────────────────

export function getLocaleTag(locale: string): string {
  if (locale === "vi") return "vi-VN";
  if (locale === "en") return "en-US";
  return locale; // pass through BCP-47 tags unchanged
}

// ─── Date / Time formatting ──────────────────────────────────────────────────

export function formatDate(
  date: string | Date,
  locale: string,
  style: "short" | "medium" | "long" = "medium"
): string {
  try {
    const localeTag = getLocaleTag(locale);
    const options: Intl.DateTimeFormatOptions =
      style === "short"
        ? { day: "2-digit", month: "2-digit" }
        : style === "long"
          ? { day: "2-digit", month: "long", year: "numeric" }
          : { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Intl.DateTimeFormat(localeTag, options).format(new Date(date));
  } catch {
    return String(date);
  }
}

export function formatTime(date: string | Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(getLocaleTag(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(getLocaleTag(locale), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

// ─── Number formatting ───────────────────────────────────────────────────────

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(getLocaleTag(locale), options).format(value);
  } catch {
    return String(value);
  }
}

// ─── Unit formatting ─────────────────────────────────────────────────────────

/**
 * Mapping from unit keys to locale labels.
 * Most medical/scientific units (kcal, bpm, kg, cm, mmHg, SpO₂) are universal.
 * Only units like "steps", "hours", "points" differ across locales.
 */
const UNIT_MAP: Record<string, Record<string, string>> = {
  kcal:    { vi: "kcal",     en: "kcal"    },  // universal
  bpm:     { vi: "bpm",      en: "bpm"     },  // universal
  steps:   { vi: "bước",     en: "steps"   },
  kg:      { vi: "kg",       en: "kg"      },  // universal
  cm:      { vi: "cm",       en: "cm"      },  // universal
  mmHg:    { vi: "mmHg",     en: "mmHg"    },  // universal
  spo2:    { vi: "SpO₂",     en: "SpO₂"   },  // universal
  "%":     { vi: "%",        en: "%"       },  // universal
  hours:   { vi: "giờ",      en: "hours"   },
  minutes: { vi: "phút",     en: "min"     },
  points:  { vi: "điểm",     en: "points"  },
  badges:  { vi: "huy hiệu", en: "badges"  },
  days:    { vi: "ngày",     en: "days"    },
  weeks:   { vi: "tuần",     en: "weeks"   },
  months:  { vi: "tháng",    en: "months"  },
};

/** Returns the localised label for a unit key, e.g. getUnitLabel("steps", "vi") → "bước" */
export function getUnitLabel(unitKey: string, locale: string): string {
  return UNIT_MAP[unitKey]?.[locale] ?? UNIT_MAP[unitKey]?.["en"] ?? unitKey;
}

/** Returns formatted value + unit label, e.g. formatUnit(5000, "steps", "vi") → "5.000 bước" */
export function formatUnit(value: number | string, unitKey: string, locale: string): string {
  const numValue = typeof value === "number" ? value : parseFloat(value);
  const formattedValue = Number.isFinite(numValue)
    ? formatNumber(numValue, locale)
    : String(value);
  const label = getUnitLabel(unitKey, locale);
  return `${formattedValue} ${label}`;
}
