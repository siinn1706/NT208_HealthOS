'use client';

import { Check } from 'lucide-react';
import type { MedDoseState } from '@/lib/mobile/mock/meds-detail';

export interface MedDoseRowProps {
  time: string;
  state: MedDoseState;
  label: string;
  primaryLine: string;
  last?: boolean;
}

export function MedDoseRow({ time, state, label, primaryLine, last }: MedDoseRowProps) {
  const taken = state === 'taken';
  const missed = state === 'missed';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderBottom: last ? 'none' : '1px solid var(--border)',
        opacity: taken ? 0.72 : 1,
      }}
    >
      <div
        className="tabular"
        style={{
          fontSize: 15,
          fontWeight: 700,
          width: 54,
          color: taken ? 'var(--ink-3)' : 'var(--ink)',
          textDecoration: taken ? 'line-through' : 'none',
        }}
      >
        {time}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{missed ? 'Missed' : primaryLine}</div>
        <div
          style={{
            fontSize: 11,
            color: taken
              ? 'var(--success, #059669)'
              : missed
                ? 'var(--danger, #E54D4D)'
                : 'var(--ink-3)',
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      </div>
      {taken && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--success, #059669)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={16} strokeWidth={3} />
        </div>
      )}
      {missed && (
        <button type="button" className="btn ghost" style={{ height: 32, fontSize: 11, padding: '0 10px', color: 'var(--danger, #E54D4D)' }}>
          Log late
        </button>
      )}
      {!taken && !missed && (
        <button type="button" className="btn" style={{ height: 32, padding: '0 14px', fontSize: 12 }}>
          Take
        </button>
      )}
    </div>
  );
}
