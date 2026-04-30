'use client';

import { useSearchParams } from 'next/navigation';
import { Search, Plus, Bot, ChevronRight } from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { TopBar } from '@/components/mobile/shell/top-bar';
import { TabBar } from '@/components/mobile/shell/tab-bar';
import { SectionHeader } from '@/components/mobile/primitives/section-header';
import { ConvRow } from './parts/conv-row';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import {
  CHAT_TOP_SUBTITLE,
  CHAT_TAB_UNREAD,
  CHAT_CONVERSATIONS,
  CHAT_AI_SUGGESTIONS,
} from '@/lib/mobile/mock/chat';

interface ChatListScreenProps {
  theme?: string;
}

export function ChatListScreen({ theme }: ChatListScreenProps) {
  const params = useSearchParams();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = theme ?? themeClass(t);
  const aiHref = `/mobile/chat/ai?t=${t}`;

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <TopBar
        title="Chat"
        subtitle={CHAT_TOP_SUBTITLE}
        right={<>
          <button type="button" className="icon-btn" aria-label="Search"><Search size={18} /></button>
          <button type="button" className="icon-btn" aria-label="New message"><Plus size={18} /></button>
        </>}
      />

      <div className="screen-body" style={{ padding: '0 20px 20px' }}>
        <Link
          href={aiHref}
          className="card"
          style={{
            display: 'block', padding: 14, marginBottom: 14, textDecoration: 'none', color: 'inherit',
            background: 'linear-gradient(135deg, var(--brand-soft) 0%, color-mix(in srgb, var(--accent) 24%, var(--card)) 100%)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--brand)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>HealthOS AI</div>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success, #059669)' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>Ready to help · Always private</div>
            </div>
            <ChevronRight size={18} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {CHAT_AI_SUGGESTIONS.map((s) => (
              <span
                key={s}
                style={{
                  padding: '6px 10px', borderRadius: 100,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-2)',
                }}
              >{s}</span>
            ))}
          </div>
        </Link>

        <SectionHeader title="Conversations" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {CHAT_CONVERSATIONS.map((c) => (
            <ConvRow
              key={c.name}
              avatar={c.avatar}
              name={c.name}
              preview={c.preview}
              time={c.time}
              unread={c.unread || undefined}
              role={c.role}
              color={c.color}
            />
          ))}
        </div>
      </div>

      <TabBar active="chat" unread={CHAT_TAB_UNREAD} />
    </PhoneShell>
  );
}
