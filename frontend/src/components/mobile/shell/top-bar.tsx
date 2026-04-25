'use client';

import type { ReactNode } from 'react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function TopBar({ title, subtitle, left, right }: TopBarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {left}
        <div style={{ minWidth: 0 }}>
          {title && (
            <div className="topbar-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
          )}
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
      </div>
      {right && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{right}</div>}
    </header>
  );
}
