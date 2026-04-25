'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCellProps {
  val: string;
  label: string;
  Icon: LucideIcon;
  color: string;
}

export function StatCell({ val, label, Icon, color }: StatCellProps) {
  return (
    <div className="card card-tight" style={{ textAlign: 'center', padding: '12px 6px' }}>
      <div style={{
        width: 28, height: 28, margin: '0 auto', borderRadius: 8,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} />
      </div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 700, marginTop: 5 }}>{val}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{label}</div>
    </div>
  );
}
