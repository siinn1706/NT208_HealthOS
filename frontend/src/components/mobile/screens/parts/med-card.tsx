'use client';

import { Pill } from 'lucide-react';

interface MedCardProps {
  color: string;
  name: string;
  dose: string;
  since: string;
  adherence: number;
  refill: string;
}

export function MedCard({ color, name, dose, since, adherence, refill }: MedCardProps) {
  void since; // available for future tooltip
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Pill size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{dose}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, height: 4, background: 'var(--chip)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${adherence * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
          </div>
          <span className="tabular" style={{ fontSize: 11, fontWeight: 700, color }}>{Math.round(adherence * 100)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Refill</div>
        <div className="tabular" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{refill}</div>
      </div>
    </div>
  );
}
