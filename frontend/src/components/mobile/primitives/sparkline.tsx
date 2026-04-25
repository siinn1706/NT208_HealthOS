'use client';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}

export function Sparkline({ data, color = 'var(--brand)', height = 40, fill = true }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 200;
  const h = height;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return [x, y] as [number, number];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      {fill && <path d={area} fill={color} opacity="0.14" />}
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
