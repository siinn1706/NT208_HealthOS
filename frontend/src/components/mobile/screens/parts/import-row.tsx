'use client';

import { Check } from 'lucide-react';

interface ImportRowProps {
  name: string;
  sub: string;
  selected?: boolean;
}

/** Selectable medication import row with checkbox-style indicator. */
export function ImportRow({ name, sub, selected }: ImportRowProps) {
  return (
    <div className="card" style={{
      padding: 12, display: 'flex', alignItems: 'center', gap: 12,
      borderColor: selected ? 'var(--brand)' : 'var(--border)',
      background: selected ? 'var(--brand-soft)' : 'var(--card)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: selected ? 'var(--brand)' : 'transparent',
        border: selected ? 'none' : '1.5px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {selected && <Check size={12} style={{ color: '#fff' }} strokeWidth={3}/>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}
