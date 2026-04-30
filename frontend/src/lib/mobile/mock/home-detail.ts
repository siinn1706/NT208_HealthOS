// Mock data for Home Detail screens

export interface VitalDay {
  date: string; // e.g. "Apr 18"
  hr: number;   // bpm
  bpSys: number;
  bpDia: number;
  spo2: number; // %
  weight: number; // kg
}

export const VITALS_7DAY: VitalDay[] = [
  { date: 'Apr 18', hr: 72, bpSys: 122, bpDia: 80, spo2: 97, weight: 72.4 },
  { date: 'Apr 19', hr: 70, bpSys: 120, bpDia: 79, spo2: 98, weight: 72.2 },
  { date: 'Apr 20', hr: 68, bpSys: 118, bpDia: 78, spo2: 98, weight: 72.0 },
  { date: 'Apr 21', hr: 71, bpSys: 121, bpDia: 80, spo2: 97, weight: 72.1 },
  { date: 'Apr 22', hr: 69, bpSys: 119, bpDia: 77, spo2: 98, weight: 71.8 },
  { date: 'Apr 23', hr: 67, bpSys: 117, bpDia: 76, spo2: 99, weight: 71.9 },
  { date: 'Apr 24', hr: 68, bpSys: 118, bpDia: 78, spo2: 98, weight: 71.7 },
];

export interface ScoreCategory {
  label: string;
  val: number; // 0–100
  weight: string; // e.g. "25%"
}

export const SCORE_CATEGORIES: ScoreCategory[] = [
  { label: 'Medication adherence', val: 94, weight: '25%' },
  { label: 'Sleep quality', val: 88, weight: '20%' },
  { label: 'Activity', val: 72, weight: '20%' },
  { label: 'Vitals in range', val: 91, weight: '15%' },
  { label: 'Nutrition', val: 65, weight: '10%' },
  { label: 'Hydration', val: 64, weight: '10%' },
];

export interface AiInsight {
  heading: string;
  generatedAt: string;
  paragraphs: string[];
  bullets: string[];
  sparkData: number[];
  actionPrimary: string;
  actionGhost: string;
}

export const AI_INSIGHT: AiInsight = {
  heading: 'Your resting heart rate is trending 4 bpm lower than last week.',
  generatedAt: 'Generated Apr 24 · 09:12',
  paragraphs: [
    'A lower resting heart rate often reflects better cardiovascular fitness and recovery. For you, this likely correlates with:',
  ],
  bullets: [
    'Consistent sleep (avg 7h 12m, up from 6h 50m)',
    'Completing your daily walk 5 of 7 days',
    'Stable medication timing',
  ],
  sparkData: [72, 73, 71, 72, 70, 71, 70, 69, 70, 68, 69, 68, 67, 68],
  actionPrimary: 'Share with Dr. Nguyen',
  actionGhost: 'Dismiss',
};

export interface ActivitySummary {
  steps: { val: string; pct: number; done: boolean };
  water: { val: string; pct: number; done: boolean };
  sleep: { val: string; pct: number; done: boolean };
  meds: { val: string; pct: number; done: boolean };
}

export const TODAY_ACTIVITY: ActivitySummary = {
  steps: { val: '7,241', pct: 0.72, done: false },
  water: { val: '1.6L',  pct: 0.64, done: false },
  sleep: { val: '7h 12m', pct: 0.9,  done: true  },
  meds:  { val: '2 of 4', pct: 0.5,  done: false },
};
