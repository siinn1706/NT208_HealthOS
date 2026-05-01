'use client';

import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Bot, MoreHorizontal, Paperclip, Send } from 'lucide-react';
import { Link } from '@/navigation';
import { PhoneShell } from '@/components/mobile/shell/phone-shell';
import { DateChip } from './parts/date-chip';
import { ChatBubble } from './parts/chat-bubble';
import { parseTheme, themeClass } from '@/lib/mobile/theme';
import { CHAT_AI_MESSAGES, CHAT_DATE_CHIP, CHAT_COMPOSER_PLACEHOLDER } from '@/lib/mobile/mock/chat';

interface ChatConversationScreenProps {
  theme?: string;
}

export function ChatConversationScreen({ theme }: ChatConversationScreenProps) {
  const params = useSearchParams();
  const t = parseTheme(params.get('t'));
  const resolvedTheme = theme ?? themeClass(t);
  const backHref = `/mobile/chat?t=${t}`;

  return (
    <PhoneShell theme={resolvedTheme as 'theme-calm' | 'theme-night' | 'theme-warm'}>
      <header className="topbar" style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Link href={backHref} className="icon-btn ghost" aria-label="Back to chat list" style={{ display: 'flex' }}>
            <ChevronLeft size={20} />
          </Link>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Bot size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
              HealthOS AI
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success, #059669)' }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Always private · Never medical advice</div>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="More"><MoreHorizontal size={18} /></button>
      </header>

      <div className="screen-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DateChip text={CHAT_DATE_CHIP} />

        {CHAT_AI_MESSAGES.map((m) => {
          if (m.typing) {
            return <ChatBubble key={m.id} side="ai" typing />;
          }
          if (m.dataCard) {
            return (
              <ChatBubble key={m.id} side="ai" dataCard>
                {m.text}
              </ChatBubble>
            );
          }
          if (m.small) {
            return (
              <ChatBubble key={m.id} side="ai" small>
                {m.text}
              </ChatBubble>
            );
          }
          return (
            <ChatBubble key={m.id} side={m.side}>
              {m.text}
            </ChatBubble>
          );
        })}
      </div>

      <div style={{
        flexShrink: 0, padding: '10px 12px 20px',
        background: 'var(--bg-elev)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 24, padding: '6px 6px 6px 14px',
        }}>
          <button type="button" className="icon-btn ghost" style={{ width: 32, height: 32 }} aria-label="Attach">
            <Paperclip size={18} />
          </button>
          <input
            placeholder={CHAT_COMPOSER_PLACEHOLDER}
            readOnly
            aria-label="Message input"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', outline: 'none',
              fontFamily: 'inherit', padding: '6px 0',
            }}
          />
          <button
            type="button"
            className="icon-btn"
            style={{ background: 'var(--brand)', color: '#fff', border: 'none', width: 36, height: 36 }}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
