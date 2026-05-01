'use client';

export interface MedHistStatProps {
  n: string;
  l: string;
  c?: string;
}

export function MedHistStat({ n, l, c }: MedHistStatProps) {
  return (
    <div style={{ flex: 1 }}>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 800, color: c || 'var(--ink)' }}>{n}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
    </div>
  );
}
