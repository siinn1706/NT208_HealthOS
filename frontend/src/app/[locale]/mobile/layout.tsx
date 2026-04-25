import type { ReactNode } from 'react';
import './globals-mobile.css';

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div data-mobile-shell style={{ minHeight: '100vh', background: '#0f1319' }}>
      {children}
    </div>
  );
}
