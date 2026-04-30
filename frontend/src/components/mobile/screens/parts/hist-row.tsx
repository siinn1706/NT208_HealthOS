'use client';

import type { MedHistState } from '@/lib/mobile/mock/meds-detail';

const STATE_STYLE: Record<
  MedHistState,
  { color: string; bg: string; label: string }
> = {
  taken: {
    color: 'var(--success, #059669)',
    bg: 'color-mix(in srgb, var(--success, #059669) 15%, transparent)',
    label: 'On time',
  },
  missed: {
    color: 'var(--danger, #E54D4D)',
    bg: 'color-mix(in srgb, var(--danger, #E54D4D) 15%, transparent)',
    label: 'Missed',
  },
  late: {
    color: 'var(--warning, #D97706)',
    bg: 'color-mix(in srgb, var(--warning, #D97706) 15%, transparent)',
    label: 'Late',
  },
};

export interface MedHistRowViewProps {
  date: string;
  dose: string;
  state: MedHistState;
  last?: boolean;
}

export function MedHistRowView({ date, dose, state, last }: MedHistRowViewProps) {
  const stateStyle = STATE_STYLE[state];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{ width: 50, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{date}</div>
      <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)' }}>{dose}</div>
      <span
        style={{
          padding: '3px 8px',
          borderRadius: 100,
          background: stateStyle.bg,
          color: stateStyle.color,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        {stateStyle.label}
      </span>
    </div>
  );
}
