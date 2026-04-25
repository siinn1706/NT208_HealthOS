'use client';

import { HeartPulse } from 'lucide-react';

interface LogomarkProps {
  size?: number;
}

export function Logomark({ size = 56 }: LogomarkProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: 'linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 10px 30px -10px color-mix(in srgb, var(--brand) 50%, transparent)',
    }}>
      <HeartPulse size={size * 0.52} style={{ color: '#fff' }} strokeWidth={2.2} />
    </div>
  );
}
