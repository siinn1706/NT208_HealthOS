'use client';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 2px 10px' }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h3>
      {action && (
        <span
          role="button"
          tabIndex={0}
          onClick={onAction}
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', cursor: 'pointer' }}
        >
          {action}
        </span>
      )}
    </div>
  );
}
