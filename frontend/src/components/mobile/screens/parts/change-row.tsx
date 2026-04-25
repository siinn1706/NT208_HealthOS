'use client';

interface ChangeRowProps {
  dir: 'up' | 'down';
  label: string;
  val: string;
  change: string;
  good?: boolean;
}

/** Metric change row: direction arrow, label, delta chip, and current value. */
export function ChangeRow({ dir, label, val, change, good }: ChangeRowProps) {
  const color = good ? 'var(--success, #059669)' : 'var(--warning, #D97706)';
  const bg = good
    ? 'color-mix(in srgb, var(--success, #059669) 15%, transparent)'
    : 'color-mix(in srgb, var(--warning, #D97706) 15%, transparent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, flexShrink: 0,
      }}>
        {dir === 'up' ? '▲' : '▼'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color, marginTop: 1, fontWeight: 500 }}>{change}</div>
      </div>
      <span className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{val}</span>
    </div>
  );
}
