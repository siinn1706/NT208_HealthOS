'use client';

export function StatusBar({ time = "9:41" }: { time?: string }) {
  return (
    <div className="statusbar">
      <span>{time}</span>
      <span className="icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
          <rect x="0" y="3" width="3" height="9" rx="1" opacity="0.4"/>
          <rect x="4.5" y="2" width="3" height="10" rx="1" opacity="0.6"/>
          <rect x="9" y="0" width="3" height="12" rx="1"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <path d="M8 2.5C10.2 2.5 12.2 3.5 13.5 5.1L15 3.6C13.3 1.7 10.8 0.5 8 0.5C5.2 0.5 2.7 1.7 1 3.6L2.5 5.1C3.8 3.5 5.8 2.5 8 2.5Z" opacity="0.4"/>
          <path d="M8 5.5C9.5 5.5 10.8 6.2 11.7 7.3L13.2 5.8C11.9 4.4 10.1 3.5 8 3.5C5.9 3.5 4.1 4.4 2.8 5.8L4.3 7.3C5.2 6.2 6.5 5.5 8 5.5Z" opacity="0.7"/>
          <circle cx="8" cy="10.5" r="1.5"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="currentColor" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35" fill="none"/>
          <rect x="22.5" y="4" width="2" height="4" rx="1" opacity="0.4"/>
          <rect x="2" y="2" width="16" height="8" rx="2"/>
        </svg>
      </span>
    </div>
  );
}
