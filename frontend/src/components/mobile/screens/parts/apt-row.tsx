'use client';

import type { LucideIcon } from 'lucide-react';

interface AptRowProps {
  dow: string;
  dd: string;
  title: string;
  sub: string;
  time: string;
  type: string;
  Icon: LucideIcon;
}

export function AptRow({ dow, dd, title, sub, time, type, Icon }: AptRowProps) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
      <div style={{
        width: 48, height: 56, borderRadius: 12,
        background: 'var(--brand-soft)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--brand)', letterSpacing: 0.6 }}>{dow}</div>
        <div className="tabular" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand)', lineHeight: 1 }}>{dd}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11, color: 'var(--ink-2)' }}>
          <span className="tabular" style={{ fontWeight: 600 }}>{time}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={11} /> {type}</span>
        </div>
      </div>
    </div>
  );
}
