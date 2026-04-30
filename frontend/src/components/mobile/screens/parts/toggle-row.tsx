'use client';

import { useState } from 'react';
import { useToggleKeyboard } from '@/components/mobile/primitives/use-toggle-keyboard';

interface ToggleRowProps {
  label: string;
  sub?: string;
  on?: boolean;
  last?: boolean;
  onChange?: (next: boolean) => void;
}

/** List row with a toggle switch — used in pickers screen. */
export function ToggleRow({ label, sub, on: onProp = false, last, onChange }: ToggleRowProps) {
  /* Uncontrolled fallback: maintain internal state when no onChange provided */
  const [localOn, setLocalOn] = useState(onProp);
  const controlled = onChange !== undefined;
  const on = controlled ? onProp : localOn;

  function toggle() {
    if (controlled) {
      onChange(!on);
    } else {
      setLocalOn((v) => !v);
    }
  }

  const handleKeyDown = useToggleKeyboard(toggle);
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

      <div
        role="switch"
        tabIndex={0}
        aria-checked={on}
        aria-label={label}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          width: 42,
          height: 26,
          borderRadius: 13,
          background: trackBg,
          flexShrink: 0,
          transition: 'background .2s',
          cursor: 'pointer',
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
