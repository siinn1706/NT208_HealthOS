'use client';

import type { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  Ic: LucideIcon;
  label: string;
  val: string;
  last?: boolean;
}

export function DetailRow({ Ic, label, val, last }: DetailRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ width: 28, color: 'var(--ink-3)' }}><Ic size={16}/></div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, width: 80 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{val}</div>
    </div>
  );
}
