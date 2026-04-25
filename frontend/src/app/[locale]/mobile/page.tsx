'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SCREEN_CATALOG, SECTIONS, getScreensBySection } from '@/lib/mobile/screen-catalog';
import { MOBILE_THEMES, THEME_LABELS, type MobileTheme } from '@/lib/mobile/theme';

const THEME_STORAGE_KEY = 'mobile-demo-theme';

export default function MobileIndexPage() {
  const [theme, setTheme] = useState<MobileTheme>('calm');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as MobileTheme | null;
    if (stored === 'night' || stored === 'warm') setTheme(stored);
  }, []);

  function selectTheme(t: MobileTheme) {
    setTheme(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
  }

  const total = SCREEN_CATALOG.length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px', color: '#eaeef2' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#5ba8c8', marginBottom: 8 }}>
          NT208 · Group 3
        </div>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>
          HealthOS Mobile Redesign
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, color: '#8296ac', lineHeight: 1.6, maxWidth: 600 }}>
          A complete mobile UI for the HealthOS platform — {total} screens across 6 sections. Static demo
          with three themes. All screens link from this index.
        </p>
      </div>

      {/* Theme picker */}
      <div style={{
        display: 'inline-flex', gap: 6, padding: '6px', borderRadius: 14,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 48,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5e7289', padding: '8px 10px', alignSelf: 'center' }}>Theme</span>
        {MOBILE_THEMES.map((t) => (
          <button
            key={t}
            onClick={() => selectTheme(t)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: theme === t ? '#5ba8c8' : 'transparent',
              color: theme === t ? '#fff' : '#8296ac',
              transition: 'all .15s',
            }}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const screens = getScreensBySection(section);
        return (
          <section key={section} style={{ marginBottom: 48 }}>
            <h2 style={{
              margin: '0 0 16px', fontSize: 13, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase', color: '#5ba8c8',
              borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10,
            }}>
              {section} <span style={{ color: '#5e7289', fontWeight: 500 }}>({screens.length})</span>
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}>
              {screens.map((screen) => {
                const href = screen.route.includes('?')
                  ? `${screen.route}&t=${theme}`
                  : `${screen.route}?t=${theme}`;
                return (
                  <Link
                    key={screen.id}
                    href={href}
                    style={{
                      display: 'block', padding: '14px 16px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#c7d1dc', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                      lineHeight: 1.4, transition: 'background .15s, border-color .15s',
                    }}
                  >
                    {screen.label}
                    <div style={{ fontSize: 10, color: '#5e7289', marginTop: 4, fontWeight: 500, fontFamily: 'monospace' }}>
                      {screen.route}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <footer style={{ marginTop: 60, fontSize: 12, color: '#5e7289', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
        NT208 HealthOS · Mobile Redesign · {total} screens · Static mock data · No BFF wiring
      </footer>
    </div>
  );
}
