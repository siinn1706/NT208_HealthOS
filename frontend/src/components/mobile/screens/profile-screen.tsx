'use client';

import { useSearchParams } from 'next/navigation';
import {
  Settings, Check, ChevronRight, HeartPulse, Shield, Award, Target,
  User, Activity, Lock, Bell, Globe, Sparkles, LogOut, Flame,
} from 'lucide-react';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { Avatar } from '@/components/mobile/primitives/avatar';
import { StatCell } from './parts/stat-cell';
import { MenuGroup } from './parts/menu-group';
import { MenuRow } from './parts/menu-row';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import {
  PROFILE_USER,
  PROFILE_STATS,
  PROFILE_MENU_GROUPS,
  PROFILE_APP_VERSION,
  PROFILE_EMERGENCY,
} from '@/lib/mobile/mock/profile';
import type { LucideIcon } from 'lucide-react';

const MENU_ICONS: Record<string, LucideIcon> = {
  user: User,
  heartPulse: HeartPulse,
  activity: Activity,
  target: Target,
  shield: Shield,
  lock: Lock,
  bell: Bell,
  globe: Globe,
  sparkles: Sparkles,
  logOut: LogOut,
};

const STAT_ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  award: Award,
  target: Target,
};

interface ProfileScreenProps {
  theme?: string;
}

export function ProfileScreen({ theme }: ProfileScreenProps) {
  const params = useSearchParams();
  const resolvedTheme = theme ?? themeClass(parseTheme(params.get('t')));

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        title="Me"
        right={<button type="button" className="icon-btn" aria-label="Settings"><Settings size={18} /></button>}
      />

      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <div className="card" style={{ padding: 18, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 10 }}>
            <Avatar name={PROFILE_USER.initials} size={84} />
            <div style={{
              position: 'absolute', bottom: 0, right: 'calc(50% - 48px)',
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--success, #059669)', color: '#fff',
              border: '3px solid var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
            }}>
              <Check size={12} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{PROFILE_USER.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
            {PROFILE_USER.age} · {PROFILE_USER.sex} · {PROFILE_USER.city}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
            <span className="chip brand"><Shield size={11} /> Verified</span>
            <span className="chip"><Award size={11} /> Level {PROFILE_USER.level}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {PROFILE_STATS.map((s) => {
            const Ic = STAT_ICONS[s.icon];
            if (!Ic) return null;
            return <StatCell key={s.label} val={s.val} label={s.label} Icon={Ic} color={s.color} />;
          })}
        </div>

        <div className="card" style={{
          marginBottom: 14, padding: 0, overflow: 'hidden',
          background: 'linear-gradient(135deg, #E54D4D 0%, #B83838 100%)',
          border: 'none', color: '#fff',
        }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HeartPulse size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{PROFILE_EMERGENCY.title}</div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>{PROFILE_EMERGENCY.sub}</div>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>

        {PROFILE_MENU_GROUPS.map((group) => (
          <MenuGroup key={group.title} title={group.title}>
            {group.rows.map((row) => {
              const Ic = MENU_ICONS[row.icon];
              if (!Ic) return null;
              return (
                <MenuRow
                  key={row.label}
                  Icon={Ic}
                  label={row.label}
                  val={row.val}
                  toggle={row.toggle}
                  last={row.last}
                  danger={row.danger}
                />
              );
            })}
          </MenuGroup>
        ))}

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-4)', marginTop: 16 }}>
          {PROFILE_APP_VERSION}
        </div>
      </div>

      <TabBar active="me" />
    </PhoneShell>
  );
}
