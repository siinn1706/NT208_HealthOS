'use client';

import { AlertTriangle, Check, Upload, X } from 'lucide-react';

interface UploadRowProps {
  name: string;
  size: string;
  done?: boolean;
  progress?: number;
  error?: boolean;
  last?: boolean;
}

/** Single file row in an upload list — shows done / uploading / error states. */
export function UploadRow({ name, size, done, progress, error, last }: UploadRowProps) {
  const iconBg = error
    ? 'color-mix(in srgb, var(--danger, #E54D4D) 14%, transparent)'
    : done
    ? 'color-mix(in srgb, var(--success, #059669) 14%, transparent)'
    : 'var(--brand-soft)';

  const iconColor = error
    ? 'var(--danger, #E54D4D)'
    : done
    ? 'var(--success, #059669)'
    : 'var(--brand)';

  const statusColor = error
    ? 'var(--danger, #E54D4D)'
    : done
    ? 'var(--success, #059669)'
    : 'var(--brand)';

  const statusText = error
    ? 'Upload failed · tap to retry'
    : done
    ? `${size} · Uploaded`
    : `${size} · Uploading…`;

  return (
    <div style={{ padding: 14, borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* File icon badge */}
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: iconBg,
          color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }} aria-hidden="true">
          {error
            ? <AlertTriangle size={15} />
            : done
            ? <Check size={15} strokeWidth={3} />
            : <Upload size={15} />}
        </div>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontSize: 11, marginTop: 1, color: statusColor }}>
            {statusText}
          </div>
        </div>

        {/* Remove button */}
        <button
          className="icon-btn ghost"
          aria-label={`Remove ${name}`}
          style={{ width: 28, height: 28 }}
        >
          <X size={16} style={{ color: 'var(--ink-3)' }} />
        </button>
      </div>

      {/* Progress bar */}
      {progress != null && (
        <div style={{ height: 4, background: 'var(--chip)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--brand)' }} />
        </div>
      )}
    </div>
  );
}
