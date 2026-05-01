'use client';

import type { ReactNode } from 'react';
import { StatusBar } from './status-bar';

type MobileTheme = 'theme-calm' | 'theme-night' | 'theme-warm';

interface PhoneShellProps {
  theme?: MobileTheme;
  time?: string;
  children: ReactNode;
  className?: string;
}

export function PhoneShell({ theme = 'theme-calm', time = '9:41', children, className = '' }: PhoneShellProps) {
  return (
    <div className={`screen ${theme} ${className}`}>
      <StatusBar time={time} />
      {children}
    </div>
  );
}
