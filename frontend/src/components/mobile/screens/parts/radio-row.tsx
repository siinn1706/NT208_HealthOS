'use client';

interface RadioRowProps {
  label: string;
  sub?: string;
  on?: boolean;
  last?: boolean;
}

/** List row with a radio button indicator — used in pickers screen. */
export function RadioRow({ label, sub, on, last }: RadioRowProps) {
  return (
    <div
      role="radio"
      aria-checked={on ?? false}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderBottom: last ? 'none' : '1px solid var(--border)',
        background: on ? 'var(--brand-soft)' : 'transparent',
      }}
    >
      {/* Radio circle */}
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `2px solid ${on ? 'var(--brand)' : 'var(--border-strong)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {on && (
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--brand)',
          }} />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
        )}
      </div>
    </div>
  );
}
