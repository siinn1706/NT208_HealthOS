'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface NextUpRowProps {
  time: string;
  title: string;
  meta: string;
  Icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'brand' | 'warning' | 'success';
}

export function NextUpRow({ time, title, meta, Icon, badge, badgeVariant = 'brand' }: NextUpRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'var(--brand-soft)', color: 'var(--brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{time}</span>
          {badge && (
            <span className={`chip ${badgeVariant}`} style={{ fontSize: 10, padding: '2px 7px' }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{meta}</div>
      </div>
      <ChevronRight size={16} />
    </div>
  );
}
