'use client';

import { Camera, Mic, X, Video, MoreHorizontal } from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';

const CONTROLS = [
  { Icon: Camera },
  { Icon: Mic },
  { Icon: X,    end: true },
  { Icon: Video },
  { Icon: MoreHorizontal },
];

interface JoinVideoVisitScreenProps {
  theme?: string;
}

export function JoinVideoVisitScreen({ theme: _theme = 'theme-calm' }: JoinVideoVisitScreenProps) {
  // Video visit always renders in night/dark mode per the source design
  return (
    <PhoneShell theme="theme-night">
      <div className="screen-body" style={{ position: 'relative', padding: 0, background: '#0A0D13' }}>

        {/* Doctor video background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 35% 30%, #2a3a52, #0A0D13)',
        }}>
          {/* Doctor avatar */}
          <div style={{
            position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 120, height: 120, borderRadius: '50%',
            background: 'linear-gradient(135deg, #5BA8C8, #1965B3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 44, fontWeight: 700,
            boxShadow: '0 0 60px rgba(91,168,200,0.5)',
          }}>L</div>
          <div style={{ position: 'absolute', top: 'calc(38% + 80px)', left: 0, right: 0, textAlign: 'center', color: '#EAEEF2' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Dr. Nguyen Lan</div>
            <div style={{ fontSize: 12, color: '#8296AC', marginTop: 4 }}>Cardiology · Connected</div>
          </div>
        </div>

        {/* Self preview */}
        <div style={{
          position: 'absolute', top: 60, right: 16,
          width: 96, height: 128, borderRadius: 16,
          background: 'linear-gradient(135deg, #1a2130, #0B0F14)',
          border: '1.5px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)', fontSize: 28, fontWeight: 700,
        }}>M</div>

        {/* Live indicator */}
        <div style={{ position: 'absolute', top: 56, left: 16, display: 'flex', gap: 8 }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block', marginRight: 4 }}/>
            LIVE · 04:12
          </span>
        </div>

        {/* Bottom controls */}
        <div style={{
          position: 'absolute', bottom: 40, left: 0, right: 0,
          padding: '16px 20px',
          display: 'flex', justifyContent: 'center', gap: 14,
        }}>
          {CONTROLS.map(({ Icon, end }, i) => (
            <button key={i} style={{
              width: 56, height: 56, borderRadius: '50%',
              background: end ? '#E54D4D' : 'rgba(255,255,255,0.14)',
              border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}>
              <Icon size={22}/>
            </button>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
