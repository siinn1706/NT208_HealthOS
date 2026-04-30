'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Camera, Mic, X, MessageCircle, MoreHorizontal } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { parseTheme, themeClass, type MobileTheme } from '@/lib/mobile/theme';
import { CARE_JOIN_VIDEO } from '@/lib/mobile/mock/care';

interface JoinVideoVisitScreenProps { theme?: string; }

export function JoinVideoVisitScreen({ theme: themeProp }: JoinVideoVisitScreenProps) {
  const params = useParams();
  const paramsId = params?.id;
  const id = typeof paramsId === 'string' ? paramsId : 'apt1';
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = parseTheme(searchParams.get('t')) as MobileTheme;
  const resolvedTheme = (themeProp ?? themeClass(t)) as 'theme-calm' | 'theme-night' | 'theme-warm';
  const q = `t=${t}`;
  const v = CARE_JOIN_VIDEO;

  const bottom = [
    { Ic: Camera, end: false },
    { Ic: Mic, end: false },
    { Ic: X, end: true },
    { Ic: MessageCircle, end: false },
    { Ic: MoreHorizontal, end: false },
  ] as const;

  return (
    <PhoneShell theme={resolvedTheme}>
      <div
        className="screen-body"
        style={{ position: 'relative', padding: 0, background: '#0A0D13', flex: 1, minHeight: 0 }}
      >
        <button
          type="button"
          onClick={() => { router.push(`/mobile/care/appointments/${id}?${q}`); }}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 2,
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Back"
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
        </button>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 35% 30%, #2a3a52, #0A0D13)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '38%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #5BA8C8, #1965B3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 44,
              fontWeight: 700,
              boxShadow: '0 0 60px rgba(91,168,200,0.5)',
            }}
          >
            {v.doctorInitial}
          </div>
          <div style={{ position: 'absolute', top: 'calc(38% + 80px)', left: 0, right: 0, textAlign: 'center', color: '#EAEEF2' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{v.doctorName}</div>
            <div style={{ fontSize: 12, color: '#8296AC', marginTop: 4 }}>{v.line}</div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            width: 96,
            height: 128,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1a2130, #0B0F14)',
            border: '1.5px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {v.selfInitial}
        </div>

        <div style={{ position: 'absolute', top: 56, left: 16, display: 'flex', gap: 8 }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
            {v.liveLabel}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
          }}
        >
          {bottom.map((b, i) => (
            <button
              key={i}
              type="button"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: b.end ? '#E54D4D' : 'rgba(255,255,255,0.14)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
              aria-label={b.Ic === Mic ? 'Microphone' : b.Ic === X ? 'Leave' : 'Control'}
            >
              <b.Ic size={22} />
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
