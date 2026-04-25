/** Mock data for the Medications screen. */

export const MEDS_ADHERENCE = {
  value: 0.94,
  days: 28,
  total: 30,
  missedLabel: '2 doses missed this month',
};

export const MEDS_REFILL_ALERT = {
  name: 'Metformin',
  daysLeft: 4,
  pharmacy: 'Pharmacy - District 1',
};

export type DoseState = 'taken' | 'due' | 'pending';

export interface DoseItem {
  icon: 'sun' | 'coffee' | 'moon';
  time: string;
  name: string;
  dose: string;
  meal: string;
  state: DoseState;
}

export const MEDS_DOSES: DoseItem[] = [
  { icon: 'sun',    time: '8:00',  name: 'Metformin',   dose: '500 mg · 1 tab',  meal: 'With breakfast', state: 'taken' },
  { icon: 'coffee', time: '13:00', name: 'Lisinopril',  dose: '10 mg · 1 tab',   meal: 'With lunch',     state: 'taken' },
  { icon: 'sun',    time: '14:00', name: 'Vitamin D3',  dose: '1000 IU · 1 cap', meal: 'Any time',       state: 'due' },
  { icon: 'moon',   time: '20:00', name: 'Atorvastatin',dose: '20 mg · 1 tab',   meal: 'With dinner',    state: 'pending' },
];

export interface MedCardItem {
  color: string;
  name: string;
  dose: string;
  since: string;
  adherence: number;
  refill: string;
}

export const MEDS_ACTIVE: MedCardItem[] = [
  { color: '#1965B3', name: 'Metformin',    dose: '500 mg · 2×/day',        since: 'Since Jan 12', adherence: 0.96, refill: '4 days' },
  { color: '#41BCE6', name: 'Lisinopril',   dose: '10 mg · 1×/day',         since: 'Since Mar 3',  adherence: 0.93, refill: '21 days' },
  { color: '#E3B79A', name: 'Atorvastatin', dose: '20 mg · 1×/day evening', since: 'Since Feb 18', adherence: 0.89, refill: '12 days' },
];
