'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import {
  Camera, HeartPulse, Pill, Droplets, Moon, Activity,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { BackBar } from '@/components/mobile/shell/back-bar';
import { parseTheme, themeClass } from '@/lib/mobile/theme';

interface QuickActionSheetScreenProps { theme?: string; }

const ACTIONS = [
  { Ic: Camera, label: 'Meal photo', sub: 'Snap & identify' },
  { Ic: HeartPulse, label: 'Vitals', sub: 'BP, HR, glucose' },
  { Ic: Pill, label: 'Take medication', sub: 'Log a dose' },
  { Ic: Droplets, label: 'Water', sub: '+250 ml' },
  { Ic: Moon, label: 'Sleep', sub: 'Start / end' },
  { Ic: Activity, label: 'Workout', sub: 'Manual log' },
] as const;

export function QuickActionSheetScreen({ theme: themeProp }: QuickActionSheetScreenProps) {
  const params = useSearchParams();
  const router = useRouter();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';

  return (
    <PhoneShell theme={resolvedTheme}>
      <BackBar title="Log something" onBack={() => router.push(`/mobile?t=${t}`)} />
      <div className="screen-body" style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'color-mix(in srgb, #000 45%, transparent)',
        }} />
        <div style={{ padding: '20px 20px 0', opacity: 0.3, pointerEvents: 'none' }}>
          <div style={{ height: 80, borderRadius: 20, background: 'var(--card)' }} />
          <div style={{ height: 100, borderRadius: 16, background: 'var(--card)', marginTop: 12 }} />
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-elev)',
          borderRadius: '24px 24px 0 0',
          padding: '10px 20px 28px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'var(--border-strong)', margin: '0 auto 14px',
          }} />
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Log something</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>What would you like to add?</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                className="card"
                style={{
                  padding: 14, textAlign: 'left', background: 'var(--card)',
                  cursor: 'pointer', fontFamily: 'inherit', border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--brand-soft)', color: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><a.Ic size={18} /></div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
