'use client';

import { useToggleKeyboard } from '@/components/mobile/primitives/use-toggle-keyboard';

interface RadioRowProps {
  label: string;
  sub?: string;
  on?: boolean;
  last?: boolean;
  /** Called when this option is selected. */
  onChange?: () => void;
}

/** List row with a radio button indicator — used in pickers screen. */
export function RadioRow({ label, sub, on, last, onChange }: RadioRowProps) {
  const handleKeyDown = useToggleKeyboard(() => onChange?.());
  return (
    <div
      role="radio"
      tabIndex={on ? 0 : -1}
      aria-checked={on ?? false}
      aria-label={label}
      onClick={() => onChange?.()}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderBottom: last ? 'none' : '1px solid var(--border)',
        background: on ? 'var(--brand-soft)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `2px solid ${on ? 'var(--brand)' : 'var(--border-strong)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {on && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--brand)',
            }}
            aria-hidden="true"
          />
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
