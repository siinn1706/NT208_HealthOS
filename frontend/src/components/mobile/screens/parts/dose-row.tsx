'use client';

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import type { DoseState } from '@/lib/mobile/mock/meds';

interface DoseRowProps {
  Icon: LucideIcon;
  time: string;
  name: string;
  dose: string;
  meal: string;
  state: DoseState;
  takenAt?: string;
}

export function DoseRow({ Icon, time, name, dose, meal, state, takenAt }: DoseRowProps) {
  const isTaken = state === 'taken';
  const isDue = state === 'due';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isTaken ? 'color-mix(in srgb, var(--success) 16%, transparent)'
          : isDue ? 'color-mix(in srgb, var(--warning) 18%, transparent)'
          : 'var(--brand-soft)',
        color: isTaken ? 'var(--success)' : isDue ? 'var(--warning)' : 'var(--brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{time}</span>
          {isDue && <span className="chip warning" style={{ fontSize: 10, padding: '2px 7px' }}>Due</span>}
          {isTaken && takenAt && (
            <span className="chip success" style={{ fontSize: 10, padding: '2px 7px' }}>Taken {takenAt}</span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
          {name} <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 12 }}>· {dose}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{meal}</div>
      </div>
      {isTaken ? (
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Check size={16} />
        </div>
      ) : (
        <button style={{
          height: 34, padding: '0 12px', borderRadius: 17,
          background: isDue ? 'var(--brand)' : 'var(--chip)',
          color: isDue ? '#fff' : 'var(--ink-2)',
          border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>Take</button>
      )}
    </div>
  );
}
