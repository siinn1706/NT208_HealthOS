export type PasswordStrength = 'weak' | 'fair' | 'strong';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function sanitizeUsername(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 30);
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value.trim());
}

export function isPasswordComplex(value: string): boolean {
  return (
    value.length >= 8
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && SPECIAL_RE.test(value)
  );
}

export function getPasswordStrength(value: string): PasswordStrength {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
    SPECIAL_RE.test(value),
  ].filter(Boolean).length;

  if (score >= 5) return 'strong';
  if (score >= 3) return 'fair';
  return 'weak';
}
