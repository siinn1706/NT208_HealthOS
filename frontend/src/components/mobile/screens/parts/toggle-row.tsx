'use client';

interface ToggleRowProps {
  label: string;
  sub?: string;
  on?: boolean;
  last?: boolean;
}

/** List row with a toggle switch — used in pickers screen. */
export function ToggleRow({ label, sub, on, last }: ToggleRowProps) {
  /* Toggle knob: pill track + circle thumb */
  const trackBg = on ? 'var(--brand)' : 'var(--border-strong)';
  const thumbX = on ? 18 : 2;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
        )}
      </div>

      {/* Inline toggle visual */}
      <div
        role="switch"
        aria-checked={on ?? false}
        aria-label={label}
        style={{
          position: 'relative',
          width: 42,
          height: 26,
          borderRadius: 13,
          background: trackBg,
          flexShrink: 0,
          transition: 'background .2s',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3,
          left: thumbX,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left .2s',
        }} />
      </div>
    </div>
  );
}
