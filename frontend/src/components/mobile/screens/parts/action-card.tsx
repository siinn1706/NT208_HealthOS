'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface ActionCardProps {
  Ic: LucideIcon;
  color: string;
  title: string;
  sub: string;
}

/** Tappable action card with colored icon, title, subtitle, and chevron. */
export function ActionCard({ Ic, color, title, sub }: ActionCardProps) {
  return (
    <button className="card" style={{
      padding: 14, display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ic size={18}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--ink-3)' }}/>
    </button>
  );
}
