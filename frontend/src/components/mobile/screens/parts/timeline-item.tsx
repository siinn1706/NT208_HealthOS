'use client';

interface TimelineItemProps {
  year?: string;
  date: string;
  title: string;
  sub: string;
  tag: string;
  color: string;
}

export function TimelineItem({ year, date, title, sub, tag, color }: TimelineItemProps) {
  return (
    <>
      {year && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: 0.4,
          margin: '6px 0 10px -22px', paddingLeft: 22,
        }}>
          {year}
        </div>
      )}
      <div style={{ position: 'relative', paddingBottom: 14 }}>
        <div style={{
          position: 'absolute', left: -22, top: 4,
          width: 16, height: 16, borderRadius: '50%',
          background: color, border: '3px solid var(--bg)',
        }}/>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>{date}</span>
            <span style={{
              padding: '2px 7px', borderRadius: 100,
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
              color, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
            }}>
              {tag}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
        </div>
      </div>
    </>
  );
}
