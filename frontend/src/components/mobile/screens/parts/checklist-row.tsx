'use client';

import { Check } from 'lucide-react';

interface ChecklistRowProps {
  text: string;
  done?: boolean;
  last?: boolean;
}

export function ChecklistRow({ text, done, last }: ChecklistRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: done ? 'var(--brand)' : 'transparent',
        border: done ? 'none' : '1.5px solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done && <Check size={12} style={{ color: '#fff' }} strokeWidth={3}/>}
      </div>
      <div style={{
        flex: 1, fontSize: 13, lineHeight: 1.4,
        color: done ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: done ? 'line-through' : 'none',
      }}>
        {text}
      </div>
    </div>
  );
}
