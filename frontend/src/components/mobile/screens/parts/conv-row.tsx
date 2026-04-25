'use client';

import { Avatar } from '@/components/mobile/primitives/avatar';

interface ConvRowProps {
  avatar: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  role: string;
  color?: string;
}

export function ConvRow({ avatar, name, preview, time, unread, role, color }: ConvRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 4px', borderBottom: '1px solid var(--border)',
    }}>
      <Avatar name={avatar} size={46} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <span className="tabular" style={{ fontSize: 11, color: unread ? 'var(--brand)' : 'var(--ink-4)', fontWeight: unread ? 700 : 500, flexShrink: 0 }}>{time}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 1 }}>{role}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <div style={{
            fontSize: 12, color: unread ? 'var(--ink-2)' : 'var(--ink-3)',
            fontWeight: unread ? 600 : 500, flex: 1, minWidth: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{preview}</div>
          {unread ? (
            <span style={{
              minWidth: 18, height: 18, padding: '0 6px',
              background: 'var(--brand)', color: '#fff',
              borderRadius: 9, fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unread}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
