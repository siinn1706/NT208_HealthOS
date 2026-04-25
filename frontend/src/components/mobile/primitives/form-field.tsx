'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}

export function FormField({ label, children, error, hint }: FormFieldProps) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--ink-2)',
        marginBottom: 6,
        letterSpacing: 0.1,
      }}>
        {label}
      </div>
      {children}
      {error && (
        <div style={{
          fontSize: 11,
          color: 'var(--danger, #E54D4D)',
          marginTop: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <AlertTriangle size={11} /> {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
          {hint}
        </div>
      )}
    </label>
  );
}
