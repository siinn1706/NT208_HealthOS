'use client';

import { ChevronRight, Stethoscope } from 'lucide-react';

export interface MedSourceRowProps {
  name: string;
  sub: string;
  connected: boolean;
  last?: boolean;
}

export function MedSourceRow({ name, sub, connected, last }: MedSourceRowProps) {
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
        <Stethoscope size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div
          style={{
            fontSize: 11,
            color: connected ? 'var(--success, #059669)' : 'var(--ink-3)',
            marginTop: 1,
          }}
        >
          {sub}
        </div>
      </div>
      {connected ? (
        <span className="chip success">Connected</span>
      ) : (
        <ChevronRight size={16} style={{ color: 'var(--ink-3)' }} />
      )}
    </div>
  );
}
