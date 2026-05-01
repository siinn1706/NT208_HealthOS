'use client';

import type { ReactNode } from 'react';

type ChipVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  style?: React.CSSProperties;
}

export function Chip({ children, variant = 'default', style }: ChipProps) {
  return (
    <span className={`chip${variant !== 'default' ? ` ${variant}` : ''}`} style={style}>
      {children}
    </span>
  );
}
