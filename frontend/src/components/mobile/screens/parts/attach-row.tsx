'use client';

import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AttachRowProps {
  name: string;
  size: string;
  Icon: LucideIcon;
  last?: boolean;
}

export function AttachRow({ name, size, Icon, last }: AttachRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--chip)',
          color: 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{size}</div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}
