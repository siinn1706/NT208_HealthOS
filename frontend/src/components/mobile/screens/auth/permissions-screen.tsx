'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  Camera,
  Calendar,
  Check,
  ChevronLeft,
  Coffee,
  Footprints,
  HeartPulse,
  Lock,
  Moon,
  Pill,
  Sparkles,
} from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { FullButton } from '@/components/mobile/primitives/full-button';
import { useMobileTQuery, useMobileThemeParam } from '@/lib/mobile/use-mobile-theme';
import type { PermissionKind } from '@/lib/mobile/permission-kinds';

const VARIANTS: Record<
  PermissionKind,
  {
    Hero: LucideIcon;
    title: string;
    body: string;
    cta: string;
    bullets: { label: string; Ic: LucideIcon }[];
  }
> = {
  notifications: {
    Hero: Bell,
    title: 'Turn on reminders',
    body: "We'll nudge you when it's time for medication or a scheduled appointment. Nothing else — ever.",
    cta: 'Allow notifications',
    bullets: [
      { label: 'Medication reminders', Ic: Pill },
      { label: 'Appointment alerts', Ic: Calendar },
      { label: 'Weekly health digest', Ic: Sparkles },
    ],
  },
  camera: {
    Hero: Camera,
    title: 'Snap meals & scans',
    body: 'Use your camera to log food, scan prescriptions, or capture lab reports. Images stay on your device unless you save them.',
    cta: 'Allow camera',
    bullets: [
      { label: 'Log meals from photo', Ic: Coffee },
      { label: 'Scan prescriptions', Ic: Pill },
      { label: 'Capture lab reports', Ic: Activity },
    ],
  },
  health: {
    Hero: Activity,
    title: 'Connect your health data',
    body: 'Link Apple Health, Google Health Connect, or a wearable to auto-sync vitals and activity. Read-only by default.',
    cta: 'Connect Health Connect',
    bullets: [
      { label: 'Heart rate & vitals', Ic: HeartPulse },
      { label: 'Steps & activity', Ic: Footprints },
      { label: 'Sleep tracking', Ic: Moon },
    ],
  },
};

interface PermissionsScreenProps {
  kind: PermissionKind;
  /** Optional override; defaults to `?t=` in the URL. */
  theme?: string;
}

export function PermissionsScreen({ kind, theme: themeProp }: PermissionsScreenProps) {
  const { theme: fromUrl } = useMobileThemeParam();
  const t = useMobileTQuery();
  const theme = themeProp ?? fromUrl;
  const v = VARIANTS[kind];
  const Hero = v.Hero;
  const backHref = `/mobile?${t}`;

  return (
    <PhoneShell theme={theme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        left={(
          <Link href={backHref} className="icon-btn ghost" aria-label="Back" style={{ display: 'flex' }}>
            <ChevronLeft size={20} />
          </Link>
        )}
        title=""
        right={(
          <Link href={`/mobile/home?${t}`} style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, textDecoration: 'none' }}>
            Skip
          </Link>
        )}
      />
      <div
        className="screen-body"
        style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 10,
        }}
        >
          <Hero size={36} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 22, lineHeight: 1.15 }}>{v.title}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.5 }}>{v.body}</div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {v.bullets.map((b) => {
            const Bic = b.Ic;
            return (
              <div key={b.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                >
                  <Bic size={16} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.label}</div>
                <Check size={16} style={{ marginLeft: 'auto', color: 'var(--success, #059669)' }} />
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          fontSize: 11,
          color: 'var(--ink-3)',
          textAlign: 'center',
          margin: '18px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
        >
          <Lock size={11} /> Private by default · revoke anytime
        </div>
        <FullButton>{v.cta}</FullButton>
        <button
          type="button"
          style={{
            height: 44,
            marginTop: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-3)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Not now
        </button>
      </div>
    </PhoneShell>
  );
}
