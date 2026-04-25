'use client';

interface AvatarProps {
  name?: string;
  size?: number;
  color?: string;
  src?: string;
}

export function Avatar({ name = 'JD', size = 40, color, src }: AvatarProps) {
  const bg = color || 'var(--brand-soft)';
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: src ? `url(${src}) center/cover` : bg,
        color: 'var(--brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.36,
        flexShrink: 0,
        border: '1px solid var(--border)',
      }}
      aria-label={name}
    >
      {!src && name.slice(0, 2).toUpperCase()}
    </div>
  );
}
