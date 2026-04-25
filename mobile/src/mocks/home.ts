export const todayScore = {
  value: 82,
  target: 100,
  copy: 'Looking good. 2 goals to close.',
};

export const kpis = [
  { id: 'steps',  label: 'Steps',  val: '7.2k', tgt: '10k', v: 0.72, icon: 'IconFootprints', color: '#1965B3' },
  { id: 'water',  label: 'Water',  val: '1.6L',  tgt: '2.5L', v: 0.64, icon: 'IconWater',     color: '#41BCE6' },
  { id: 'kcal',   label: 'Kcal',   val: '1420',  tgt: '2100', v: 0.68, icon: 'IconFire',      color: '#D97706' },
  { id: 'sleep',  label: 'Sleep',  val: '7h12m', tgt: '8h',   v: 0.90, icon: 'IconMoon',      color: '#7C3AED' },
];

export const nextUp = [
  { id: '1', time: '9:00',  title: 'Metformin 500 mg',      meta: 'With breakfast · 1 tab',    icon: 'IconPill',        badge: { label: 'Due now', variant: 'warning' as const } },
  { id: '2', time: '10:30', title: 'Dr. Nguyen Thi Lan',    meta: 'Video call · 30 min',        icon: 'IconVideo',       badge: { label: 'In 1h',   variant: 'default' as const } },
  { id: '3', time: '12:00', title: 'Log lunch',             meta: 'Tap to add meal',            icon: 'IconCoffee',      badge: null },
];

export const aiInsight = {
  title: 'Your resting heart rate is 4 bpm lower this week.',
  body:  'Keep up the evening walks — they\'re working.',
};

export const vitals = {
  avg: 68,
  trend: [72, 70, 74, 71, 68, 67, 68],
  deltaBpm: -4,
};

export const quickActions = [
  { id: 'meal',   label: 'Log meal',   icon: 'IconCoffee'     },
  { id: 'vitals', label: 'Log vitals', icon: 'IconActivity'   },
  { id: 'ai',     label: 'Ask AI',     icon: 'IconSparkle'    },
  { id: 'sos',    label: 'SOS',        icon: 'IconHeartPulse' },
];
