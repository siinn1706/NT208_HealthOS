export const SUPPORTED_LOCALES = ['vi', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'vi';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'vi' || value === 'en';
}

export function normalizeLocale(value?: string | null, fallback: SupportedLocale = FALLBACK_LOCALE): SupportedLocale {
  const normalized = value?.toLowerCase();
  if (!normalized) return fallback;
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('en')) return 'en';
  return fallback;
}
