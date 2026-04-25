'use client';

import { Paperclip, Camera, FileText, Activity, ChevronRight, X } from 'lucide-react';
import type { Attachment } from '@/lib/mobile/mock/care';

const ICON_MAP = {
  paperclip: Paperclip,
  camera:    Camera,
  filetext:  FileText,
  activity:  Activity,
};

interface AttachRowProps {
  attachment: Attachment;
  last?: boolean;
}

export function AttachRow({ attachment, last }: AttachRowProps) {
  const { name, size, icon, state, progress = 0 } = attachment;
  const Ic = ICON_MAP[icon];
  const uploading = state === 'uploading';
  const isError   = state === 'error';

  return (
    <div style={{
      padding: uploading ? 14 : 12,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: uploading ? 'var(--brand-soft)' : isError ? 'color-mix(in srgb, var(--danger,#E54D4D) 12%, transparent)' : 'var(--chip)',
          color: uploading ? 'var(--brand)' : isError ? 'var(--danger,#E54D4D)' : 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic size={15}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <div style={{
            fontSize: 11, marginTop: 1,
            color: uploading ? 'var(--brand)' : isError ? 'var(--danger,#E54D4D)' : 'var(--ink-3)',
          }}>
            {uploading ? `Uploading · ${size}` : isError ? `Failed · ${size}` : `${size} · Uploaded`}
          </div>
        </div>
        {uploading
          ? <X size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }}/>
          : <ChevronRight size={14} style={{ color: 'var(--ink-4)', flexShrink: 0 }}/>
        }
      </div>
      {uploading && (
        <div style={{ height: 4, background: 'var(--chip)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--brand)', borderRadius: 2 }}/>
        </div>
      )}
      {isError && (
        <div style={{ height: 4, background: 'color-mix(in srgb, var(--danger,#E54D4D) 20%, transparent)', borderRadius: 2, marginTop: 8 }}/>
      )}
    </div>
  );
}
