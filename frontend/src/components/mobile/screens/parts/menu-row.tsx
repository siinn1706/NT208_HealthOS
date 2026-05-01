'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface MenuRowProps {
  Icon: LucideIcon;
  label: string;
  val?: string;
  toggle?: boolean;
  last?: boolean;
  danger?: boolean;
}

export function MenuRow({ Icon, label, val, toggle, last, danger }: MenuRowProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: danger ? 'color-mix(in srgb, var(--danger) 14%, transparent)' : 'var(--chip)',
          color: danger ? 'var(--danger)' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} />
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? 'var(--danger)' : 'var(--ink)' }}>{label}</div>
        {toggle !== undefined ? (
          <div style={{
            width: 38, height: 22, borderRadius: 11,
            background: toggle ? 'var(--brand)' : 'var(--border-strong)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 2, left: toggle ? 18 : 2,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        ) : val ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{val}</span>
            <ChevronRight size={14} color="var(--ink-4)" />
          </>
        ) : !danger ? <ChevronRight size={14} color="var(--ink-4)" /> : null}
      </div>
      {!last && <div style={{ height: 1, background: 'var(--border)', marginLeft: 56 }} />}
    </>
  );
}
