'use client';

import type { ReactNode, CSSProperties } from 'react';

interface FormExampleProps {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}

/** Wraps a form control demo with a small uppercase label. */
export function FormExample({ title, children, style }: FormExampleProps) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
