/** Mock data for the Medications screen (Phase 2 — 30-day ring @ 87%). */

export const MEDS_TOP_SUBTITLE = '3 active · 87% adherence';

export const MEDS_ADHERENCE = {
  value: 0.87,
  days: 26,
  total: 30,
  missedLabel: '2 doses missed this month',
};

/** Short label for the center of the 30-day ring. */
export const MEDS_ADHERENCE_RING_LABEL = '87%';

export const MEDS_REFILL_ALERT = {
  title: 'Metformin runs out in 4 days',
  sub: 'Pharmacy - District 1 · Tap to request refill',
};

export const MEDS_DISCLAIMER =
  "Educational reminders only — not medical advice. Follow your doctor's guidance.";

export type DoseState = 'taken' | 'due' | 'pending';

export interface DoseItem {
  icon: 'sun' | 'coffee' | 'moon';
  time: string;
  name: string;
  dose: string;
  meal: string;
  state: DoseState;
  /** Shown on the "Taken" chip when state is taken */
  takenAt?: string;
}

export const MEDS_DOSES: DoseItem[] = [
  { icon: 'sun',    time: '8:00',  name: 'Metformin',   dose: '500 mg · 1 tab',  meal: 'With breakfast', state: 'taken', takenAt: '8:02' },
  { icon: 'coffee', time: '13:00', name: 'Lisinopril',  dose: '10 mg · 1 tab',   meal: 'With lunch',     state: 'taken', takenAt: '1:04' },
  { icon: 'sun',    time: '14:00', name: 'Vitamin D3',  dose: '1000 IU · 1 cap', meal: 'Any time',       state: 'due' },
  { icon: 'moon',   time: '20:00', name: 'Atorvastatin',dose: '20 mg · 1 tab',   meal: 'With dinner',    state: 'pending' },
];

export interface MedCardItem {
  /** Route id under `/mobile/meds/[id]`; detail uses shared demo (Phase 6). */
  id: string;
  color: string;
  name: string;
  dose: string;
  since: string;
  adherence: number;
  refill: string;
}

export const MEDS_ACTIVE: MedCardItem[] = [
  { id: 'med1', color: '#1965B3', name: 'Metformin',    dose: '500 mg · 2×/day',        since: 'Since Jan 12', adherence: 0.96, refill: '4 days' },
  { id: 'med2', color: '#41BCE6', name: 'Lisinopril',   dose: '10 mg · 1×/day',         since: 'Since Mar 3',  adherence: 0.93, refill: '21 days' },
  { id: 'med3', color: '#E3B79A', name: 'Atorvastatin', dose: '20 mg · 1×/day evening', since: 'Since Feb 18', adherence: 0.89, refill: '12 days' },
];
