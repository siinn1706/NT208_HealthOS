'use client';

import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface BackBarProps {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function BackBar({ title, right, onBack }: BackBarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <button type="button" className="icon-btn ghost" onClick={onBack} aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
        {title && (
          <div className="topbar-title" style={{ fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </div>
        )}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{right}</div>}
    </header>
  );
}
