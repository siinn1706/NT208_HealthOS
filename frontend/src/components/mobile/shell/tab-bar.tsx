'use client';

import { Home, Calendar, MessageCircle, Pill, User } from 'lucide-react';

type TabKey = 'home' | 'care' | 'chat' | 'meds' | 'me';

interface TabBarProps {
  active?: TabKey;
  unread?: number;
}

const TABS: { k: TabKey; label: string; Icon: React.FC<{ size: number; strokeWidth: number }> }[] = [
  { k: 'home', label: 'Home', Icon: Home },
  { k: 'care', label: 'Care', Icon: Calendar },
  { k: 'chat', label: 'Chat', Icon: MessageCircle },
  { k: 'meds', label: 'Meds', Icon: Pill },
  { k: 'me', label: 'Me', Icon: User },
];

export function TabBar({ active = 'home', unread = 0 }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {TABS.map(({ k, label, Icon }) => {
        const isActive = active === k;
        const badge = k === 'chat' && unread > 0 ? unread : 0;
        return (
          <div key={k} className={`tab${isActive ? ' active' : ''}`} role="tab" aria-current={isActive ? 'page' : undefined}>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
            {badge > 0 && <span className="badge" aria-label={`${badge} unread`}>{badge}</span>}
          </div>
        );
      })}
    </nav>
  );
}
