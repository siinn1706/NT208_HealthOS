'use client';

interface DateChipProps {
  text: string;
}

export function DateChip({ text }: DateChipProps) {
  return (
    <div style={{ textAlign: 'center', margin: '4px 0' }}>
      <span style={{
        padding: '4px 10px', borderRadius: 100,
        background: 'var(--chip)', color: 'var(--ink-3)',
        fontSize: 11, fontWeight: 600,
      }}>{text}</span>
    </div>
  );
}
