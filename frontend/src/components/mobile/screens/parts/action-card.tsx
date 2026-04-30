'use client';

import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MedActionCardProps {
  Ic: LucideIcon;
  color: string;
  title: string;
  sub: string;
  onClick?: () => void;
}

export function MedActionCard({ Ic, color, title, sub, onClick }: MedActionCardProps) {
  return (
    <button
      type="button"
      className="card"
      onClick={onClick}
      style={{
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          flexShrink: 0,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ic size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--ink-3)' }} />
    </button>
  );
}
