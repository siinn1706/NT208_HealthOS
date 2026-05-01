'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  /** When set, label uses `htmlFor` and should match an `id` on the nested control. */
  fieldId?: string;
}

const LABEL_STYLE = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-2)',
  marginBottom: 6,
  letterSpacing: 0.1,
} as const;

export function FormField({ label, children, error, hint, fieldId }: FormFieldProps) {
  const footer = (
    <>
      {error && (
        <div style={{
          fontSize: 11,
          color: 'var(--danger, #E54D4D)',
          marginTop: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <AlertCircle size={11} /> {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
          {hint}
        </div>
      )}
    </>
  );

  if (fieldId) {
    return (
      <div style={{ display: 'block', marginBottom: 14 }}>
        <label htmlFor={fieldId} style={{ display: 'block', ...LABEL_STYLE }}>
          {label}
        </label>
        {children}
        {footer}
      </div>
    );
  }

  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={LABEL_STYLE}>{label}</div>
      {children}
      {footer}
    </label>
  );
}
