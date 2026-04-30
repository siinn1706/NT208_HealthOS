'use client';

import type { ReactNode, MouseEvent } from 'react';
import { Stethoscope, Video } from 'lucide-react';

export interface ApptCardProps {
  status: string;
  statusColor: string;
  name: string;
  meta: string;
  time: string;
  inProgress?: boolean;
  muted?: boolean;
  onJoin?: (e: MouseEvent) => void;
  action?: ReactNode;
}

export function ApptCard({
  status,
  statusColor,
  name,
  meta,
  time,
  inProgress,
  muted,
  onJoin,
  action,
}: ApptCardProps) {
  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, opacity: muted ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: 100,
            background: `color-mix(in srgb, ${statusColor} 14%, transparent)`,
            color: statusColor,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {inProgress && (
            <span
              className="care-appt-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
              }}
            />
          )}
          {status}
        </span>
        <span className="tabular" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{time}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--brand-soft)',
            color: 'var(--brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Stethoscope size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{meta}</div>
        </div>
        {action}
        {inProgress && !action && (
          <button
            type="button"
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              onJoin?.(e);
            }}
            style={{ height: 34, padding: '0 14px', fontSize: 12 }}
          >
            <Video size={14} /> Join
          </button>
        )}
      </div>
    </div>
  );
}
