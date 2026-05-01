'use client';

export interface MiniStatProps {
  n: string;
  l: string;
}

export function MiniStat({ n, l }: MiniStatProps) {
  return (
    <div className="card card-tight" style={{ textAlign: 'center', padding: '10px 6px' }}>
      <div className="tabular" style={{ fontSize: 22, fontWeight: 800 }}>
        {n}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
    </div>
  );
}
