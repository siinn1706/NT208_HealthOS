/** Mock data for the Profile screen. */

export const PROFILE_USER = {
  name: 'Minh Nguyen',
  initials: 'MN',
  age: 32,
  sex: 'Male',
  city: 'Ho Chi Minh City',
  verified: true,
  level: 4,
};

export const PROFILE_STATS = [
  { val: '28', label: 'Day streak', icon: 'flame',  color: '#E3B79A' },
  { val: '12', label: 'Badges',     icon: 'award',  color: '#E7DEA7' },
  { val: '4',  label: 'Goals active', icon: 'target', color: 'var(--brand)' },
] as const;

export interface MenuRowDef {
  icon: string;
  label: string;
  val?: string;
  toggle?: boolean;
  danger?: boolean;
  last?: boolean;
}

export interface MenuGroupDef {
  title: string;
  rows: MenuRowDef[];
}

export const PROFILE_MENU_GROUPS: MenuGroupDef[] = [
  {
    title: 'Health',
    rows: [
      { icon: 'user',       label: 'Personal details',   val: 'Complete' },
      { icon: 'heartPulse', label: 'Medical history',    val: '3 conditions' },
      { icon: 'activity',   label: 'Connected devices',  val: 'Fitbit · Withings' },
      { icon: 'target',     label: 'Health goals',       val: '4 active', last: true },
    ],
  },
  {
    title: 'Privacy & security',
    rows: [
      { icon: 'shield',  label: 'Data sharing',  val: 'Doctor only' },
      { icon: 'lock',    label: 'App lock',      toggle: true },
      { icon: 'bell',    label: 'Notifications', val: 'All reminders', last: true },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { icon: 'globe',    label: 'Language',   val: 'English' },
      { icon: 'sparkles', label: 'Appearance', val: 'System' },
      { icon: 'logOut',   label: 'Sign out',   danger: true, last: true },
    ],
  },
];
