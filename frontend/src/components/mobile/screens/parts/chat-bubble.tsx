'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface ChatBubbleProps {
  side: 'ai' | 'me';
  children?: ReactNode;
  typing?: boolean;
  small?: boolean;
  /** Renders the HR data card inside the bubble */
  dataCard?: boolean;
}

export function ChatBubble({ side, children, typing, small, dataCard }: ChatBubbleProps) {
  const me = side === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', width: '100%' }}>
      <div style={{
        maxWidth: '82%',
        padding: small ? '4px 10px' : '10px 14px',
        borderRadius: 18,
        borderTopRightRadius: me ? 4 : 18,
        borderTopLeftRadius: me ? 18 : 4,
        background: me ? 'var(--brand)' : 'var(--card)',
        color: me ? '#fff' : 'var(--ink)',
        border: me ? 'none' : '1px solid var(--border)',
        fontSize: 14, lineHeight: 1.4,
      }}>
        {typing ? (
          <span role="status" aria-live="polite" aria-label="AI is typing" style={{ display: 'inline-flex', gap: 3, padding: '4px 4px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot"
                aria-hidden="true"
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--ink-4)',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </span>
        ) : dataCard ? (
          <DataCardBubble text={children as string} />
        ) : small ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 11 }}>
            <Sparkles size={12} /> {children}
          </span>
        ) : children}
      </div>
    </div>
  );
}

function DataCardBubble({ text }: { text: string }) {
  return (
    <>
      {text && <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.4 }}>{text}</p>}
      <div style={{
        padding: 10, borderRadius: 10,
        background: 'var(--brand-soft)',
        border: '1px solid var(--border-strong)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Resting HR</div>
        <div className="tabular" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>68 bpm ▼ 4</div>
        <svg viewBox="0 0 200 40" width="100%" height={40} preserveAspectRatio="none" style={{ marginTop: 4 }}>
          <path
            d="M0,10 L33,14 L66,8 L100,12 L133,20 L166,24 L200,22"
            stroke="var(--brand)" strokeWidth="2" fill="none" strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );
}
