'use client';

interface StatBlockProps {
  label: string;
  val: string;
  unit?: string;
  primary?: boolean;
}

/** 2-column stat block card — used in vitals detail for min/avg/max. */
export function StatBlock({ label, val, unit, primary }: StatBlockProps) {
  return (
    <div className="card card-tight" style={{
      textAlign: 'center', padding: '10px 6px',
      background: primary ? 'var(--brand-soft)' : 'var(--card)',
      borderColor: primary ? 'transparent' : 'var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 800, marginTop: 3, color: primary ? 'var(--brand)' : 'var(--ink)' }}>
        {val}
      </div>
      {unit && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>{unit}</div>}
    </div>
  );
}
