'use client';

import { Stethoscope, Video } from 'lucide-react';
import type { ApptStatus } from '@/lib/mobile/mock/care';

const STATUS_COLOR: Record<ApptStatus, string> = {
  'in-progress': 'var(--success, #059669)',
  'upcoming':    'var(--brand)',
  'completed':   'var(--ink-3)',
  'cancelled':   'var(--danger, #E54D4D)',
};

const STATUS_LABEL: Record<ApptStatus, string> = {
  'in-progress': 'In progress',
  'upcoming':    'Upcoming',
  'completed':   'Completed',
  'cancelled':   'Cancelled',
};

interface ApptCardProps {
  status: ApptStatus;
  name: string;
  meta: string;
  time: string;
}

export function ApptCard({ status, name, meta, time }: ApptCardProps) {
  const color = STATUS_COLOR[status];
  const label = STATUS_LABEL[status];
  const inProgress = status === 'in-progress';
  const muted = status === 'completed' || status === 'cancelled';

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, opacity: muted ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: '3px 8px', borderRadius: 100,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          color, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {inProgress && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, animation: 'pulse 2s infinite',
            }}/>
          )}
          {label}
        </span>
        <span className="tabular" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>
          {time}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--brand-soft)', color: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Stethoscope size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{meta}</div>
        </div>
        {inProgress && (
          <button className="btn" style={{ height: 34, padding: '0 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Video size={14}/> Join
          </button>
        )}
      </div>
    </div>
  );
}
