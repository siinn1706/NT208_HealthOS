'use client';

import { useToggleKeyboard } from '@/components/mobile/primitives/use-toggle-keyboard';

export interface MedToggleProps {
  on: boolean;
  onChange?: (next: boolean) => void;
  /** Optional id of a labelling element (e.g. description text). */
  ariaLabelledBy?: string;
  'aria-label'?: string;
}

export function MedToggle({ on, onChange, ariaLabelledBy, 'aria-label': ariaLabel }: MedToggleProps) {
  const handleKeyDown = useToggleKeyboard(() => onChange?.(!on));
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={on}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      onClick={() => onChange?.(!on)}
      onKeyDown={handleKeyDown}
      style={{
        width: 42,
        height: 26,
        borderRadius: 13,
        background: on ? 'var(--brand)' : 'var(--border-strong)',
        position: 'relative',
        transition: 'background .2s',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left .2s',
        }}
      />
    </div>
  );
}
