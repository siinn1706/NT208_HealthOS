'use client';

import { RefreshCw } from 'lucide-react';

export interface MedRefillRowProps {
  date: string;
  qty: string;
  src: string;
  status: string;
  last?: boolean;
}

export function MedRefillRow({ date, qty, src, status, last }: MedRefillRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--chip)',
          color: 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RefreshCw size={15} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{date}</span>
          <span className="chip success" style={{ fontSize: 9 }}>{status}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{qty} · {src}</div>
      </div>
    </div>
  );
}
