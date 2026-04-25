'use client';

interface WheelColProps {
  values: string[];
  selected: number;
}

/** Vertical wheel-picker column — renders values with perspective fade. */
export function WheelCol({ values, selected }: WheelColProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {values.map((v, i) => {
        const dist = Math.abs(i - selected);
        return (
          <div
            key={i}
            className="tabular"
            aria-selected={dist === 0}
            style={{
              fontSize: dist === 0 ? 22 : 18,
              fontWeight: dist === 0 ? 700 : 500,
              color: dist === 0
                ? 'var(--ink)'
                : `color-mix(in srgb, var(--ink-3) ${100 - dist * 25}%, transparent)`,
              lineHeight: 1.7,
            }}
          >
            {v}
          </div>
        );
      })}
    </div>
  );
}
