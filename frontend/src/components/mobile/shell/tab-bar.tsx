'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Calendar, MessageCircle, Pill, User } from 'lucide-react';
import { Link } from '@/navigation';
import { pathToTabKey, type TabKey } from '@/lib/mobile/path-to-tab';

const TAB_ROUTES: Record<TabKey, string> = {
  home: '/mobile/home',
  care: '/mobile/care/appointments',
  chat: '/mobile/chat',
  meds: '/mobile/meds',
  me: '/mobile/profile',
};

interface TabBarProps {
  /** Explicit active tab — overrides pathname-derived key. Existing screens pass this; new routes get it for free. */
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

export function TabBar({ active: activeProp, unread = 0 }: TabBarProps) {
  // Always call unconditionally — switch on prop afterward to avoid hook-order issues.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = searchParams.get('t') ?? '';
  const active = activeProp ?? pathToTabKey(pathname);
  return (
    <nav className="tabbar" aria-label="Main navigation" role="tablist">
      {TABS.map(({ k, label, Icon }) => {
        const isActive = active === k;
        const badge = k === 'chat' && unread > 0 ? unread : 0;
        const href = t ? `${TAB_ROUTES[k]}?t=${t}` : TAB_ROUTES[k];
        return (
          <Link
            key={k}
            href={href}
            className={`tab${isActive ? ' active' : ''}`}
            role="tab"
            aria-selected={isActive}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
            <span>{label}</span>
            {badge > 0 && <span className="badge" aria-label={`${badge} unread`}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
