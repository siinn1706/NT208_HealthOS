/** Mock data for the Home / Dashboard screen. */

export const HOME_USER = {
  name: 'Minh',
  greetHour: 9,
  score: 82,
  scoreFraction: 0.82,
  scoreMessage: 'Looking good. 2 goals to close.',
};

export const HOME_KPI = [
  { label: 'Steps', val: '7.2k', tgt: '10k', v: 0.72, icon: 'footprints', col: 'var(--brand)' },
  { label: 'Water', val: '1.6L', tgt: '2.5L', v: 0.64, icon: 'droplets', col: '#41BCE6' },
  { label: 'Kcal',  val: '1420', tgt: '2100', v: 0.67, icon: 'flame',     col: '#E3B79A' },
  { label: 'Sleep', val: '7h 12m', tgt: '8h', v: 0.9,  icon: 'moon',     col: '#5B90C4' },
] as const;

export const HOME_NEXT_UP = [
  { time: '9:00',  title: 'Metformin 500 mg',        meta: 'With breakfast · 1 tab', icon: 'pill',      badge: 'Due now', badgeVariant: 'warning' as const },
  { time: '11:30', title: 'Dr. Nguyen — cardiology', meta: 'Video · 30 min',          icon: 'video',     badge: 'Upcoming', badgeVariant: 'brand' as const },
  { time: '15:00', title: 'Evening walk',             meta: '30 min · outdoor',        icon: 'footprints', badge: '', badgeVariant: 'brand' as const },
];

export const HOME_AI_INSIGHT = {
  title: 'Your resting heart rate is 4 bpm lower this week.',
  body: "That's a positive trend — likely linked to your consistent sleep. Keep it up.",
};

export const HOME_VITALS_SPARKLINE = [72, 70, 74, 71, 68, 67, 68];

export const HOME_VITALS_BLOCK = {
  label: 'Heart rate · 7 days',
  bpm: 68,
  bpmUnit: 'bpm avg',
  trendChip: '▼ 4 bpm',
} as const;

export const HOME_QUICK_ACTIONS = [
  { label: 'Log meal',   icon: 'camera' },
  { label: 'Log vitals', icon: 'heartPulse' },
  { label: 'Ask AI',     icon: 'bot' },
  { label: 'SOS card',   icon: 'shield' },
] as const;
