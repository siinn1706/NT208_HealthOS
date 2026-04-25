export const identity = {
  name: 'Minh Nguyen',
  age: 32,
  gender: 'Male',
  city: 'HCMC',
  level: 4,
  verified: true,
};

export const stats = [
  { label: 'Day streak', value: '28' },
  { label: 'Badges',     value: '12' },
  { label: 'Goals',      value: '4'  },
];

export const menuGroups = [
  {
    title: 'Health',
    items: [
      { id: 'personal',   label: 'Personal details',    icon: 'IconUser',        type: 'nav'    as const },
      { id: 'history',    label: 'Medical history',     icon: 'IconActivity',    type: 'nav'    as const },
      { id: 'devices',    label: 'Connected devices',   icon: 'IconHeartPulse',  type: 'nav'    as const },
      { id: 'goals',      label: 'Health goals',        icon: 'IconTarget',      type: 'nav'    as const },
    ],
  },
  {
    title: 'Privacy & security',
    items: [
      { id: 'sharing',    label: 'Data sharing',        icon: 'IconShield',      type: 'nav'    as const },
      { id: 'applock',    label: 'App lock',            icon: 'IconLock',        type: 'toggle' as const, defaultVal: false },
      { id: 'notifs',     label: 'Notifications',       icon: 'IconBell',        type: 'nav'    as const },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'language',   label: 'Language',            icon: 'IconGlobe',       type: 'nav'    as const, val: 'English' },
      { id: 'appearance', label: 'Appearance',          icon: 'IconSun',         type: 'nav'    as const, val: 'Calm' },
      { id: 'signout',    label: 'Sign out',            icon: 'IconLogOut',      type: 'danger' as const },
    ],
  },
];
