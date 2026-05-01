'use client';

import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';

/** `'soft'` is an alias for `'secondary'` — matches design CSS `.btn.soft` (D-3). */
type FullButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

interface FullButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: FullButtonVariant;
}

const SOFT_STYLE: CSSProperties = {
  background: 'var(--brand-soft)',
  color: 'var(--brand)',
  border: '1px solid var(--border-strong)',
};

const VARIANT_STYLES: Record<FullButtonVariant, CSSProperties> = {
  primary: { background: 'var(--brand)', color: '#fff', border: 'none' },
  secondary: SOFT_STYLE,
  soft: SOFT_STYLE,
  ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--border-strong)' },
  danger: { background: 'var(--danger, #E54D4D)', color: '#fff', border: 'none' },
};

export function FullButton({ children, variant = 'primary', style, ...rest }: FullButtonProps) {
  return (
    <button
      {...rest}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: -0.1,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
