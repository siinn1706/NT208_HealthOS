'use client';

import type { ReactNode } from 'react';

interface MenuGroupProps {
  title: string;
  children: ReactNode;
}

export function MenuGroup({ title, children }: MenuGroupProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: 0.5,
        margin: '0 2px 8px',
      }}>{title}</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
