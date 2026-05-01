export type ScreenSection =
  | 'Round 0 — Core'
  | 'Auth & Onboarding'
  | 'Home Detail'
  | 'Care'
  | 'Meds Detail'
  | 'Form Patterns';

export interface ScreenEntry {
  id: string;
  label: string;
  route: string; // relative to /mobile, e.g. "/mobile/home"
  section: ScreenSection;
}

export const SCREEN_CATALOG: ScreenEntry[] = [
  // ── Round 0 — Core ──────────────────────────────────
  { id: 'home', label: 'Home', route: '/mobile/home', section: 'Round 0 — Core' },
  { id: 'appointments', label: 'Appointments', route: '/mobile/appointments', section: 'Round 0 — Core' },
  { id: 'chat', label: 'Chat List', route: '/mobile/chat', section: 'Round 0 — Core' },
  { id: 'chat-ai', label: 'Chat — AI Conversation', route: '/mobile/chat/ai', section: 'Round 0 — Core' },
  { id: 'meds', label: 'Medications', route: '/mobile/meds', section: 'Round 0 — Core' },
  { id: 'profile', label: 'Profile', route: '/mobile/profile', section: 'Round 0 — Core' },

  // ── Auth & Onboarding ────────────────────────────────
  { id: 'auth-welcome', label: 'Welcome', route: '/mobile/auth/welcome', section: 'Auth & Onboarding' },
  { id: 'auth-login', label: 'Login', route: '/mobile/auth/login', section: 'Auth & Onboarding' },
  { id: 'auth-login-error', label: 'Login — Error', route: '/mobile/auth/login?error=1', section: 'Auth & Onboarding' },
  { id: 'auth-register', label: 'Register', route: '/mobile/auth/register', section: 'Auth & Onboarding' },
  { id: 'auth-otp', label: 'OTP Verify', route: '/mobile/auth/otp', section: 'Auth & Onboarding' },
  { id: 'auth-forgot', label: 'Forgot Password', route: '/mobile/auth/forgot', section: 'Auth & Onboarding' },
  { id: 'onboarding-profile', label: 'Health Profile Setup', route: '/mobile/onboarding/profile', section: 'Auth & Onboarding' },
  { id: 'onboarding-perm-notifications', label: 'Permissions — Notifications', route: '/mobile/onboarding/permissions/notifications', section: 'Auth & Onboarding' },
  { id: 'onboarding-perm-camera', label: 'Permissions — Camera', route: '/mobile/onboarding/permissions/camera', section: 'Auth & Onboarding' },
  { id: 'onboarding-perm-health', label: 'Permissions — Health', route: '/mobile/onboarding/permissions/health', section: 'Auth & Onboarding' },

  // ── Home Detail ──────────────────────────────────────
  { id: 'home-today', label: 'Today Overview', route: '/mobile/home/today', section: 'Home Detail' },
  { id: 'home-score', label: 'Health Score', route: '/mobile/home/score', section: 'Home Detail' },
  { id: 'home-vitals', label: 'Vitals Detail', route: '/mobile/home/vitals', section: 'Home Detail' },
  { id: 'home-insight', label: 'AI Insight Detail', route: '/mobile/home/insight', section: 'Home Detail' },
  { id: 'home-quick-action', label: 'Quick Action Sheet', route: '/mobile/home/quick-action', section: 'Home Detail' },

  // ── Care ─────────────────────────────────────────────
  { id: 'care-appointments', label: 'Appointments Refined', route: '/mobile/care/appointments', section: 'Care' },
  { id: 'care-apt-detail', label: 'Appointment Detail', route: '/mobile/care/appointments/apt1', section: 'Care' },
  { id: 'care-apt-new', label: 'Create Appointment', route: '/mobile/care/appointments/new', section: 'Care' },
  { id: 'care-apt-join', label: 'Join Video Visit', route: '/mobile/care/appointments/apt1/join', section: 'Care' },
  { id: 'care-apt-prep', label: 'Visit Prep', route: '/mobile/care/appointments/apt1/prep', section: 'Care' },
  { id: 'care-prescription', label: 'Prescription Detail', route: '/mobile/care/prescriptions/rx1', section: 'Care' },
  { id: 'care-history', label: 'Medical History', route: '/mobile/care/history', section: 'Care' },
  { id: 'care-attachments', label: 'Attachment Upload', route: '/mobile/care/attachments', section: 'Care' },

  // ── Meds Detail ──────────────────────────────────────
  { id: 'med-detail', label: 'Medication Detail', route: '/mobile/meds/med1', section: 'Meds Detail' },
  { id: 'med-take', label: 'Take Confirmation', route: '/mobile/meds/med1/take', section: 'Meds Detail' },
  { id: 'med-missed', label: 'Missed Dose', route: '/mobile/meds/med1/missed', section: 'Meds Detail' },
  { id: 'med-pause', label: 'Pause Medication', route: '/mobile/meds/med1/pause', section: 'Meds Detail' },
  { id: 'med-archive', label: 'Archive Medication', route: '/mobile/meds/med1/archive', section: 'Meds Detail' },
  { id: 'med-refills', label: 'Refill Log', route: '/mobile/meds/med1/refills', section: 'Meds Detail' },
  { id: 'med-history', label: 'Medication History', route: '/mobile/meds/med1/history', section: 'Meds Detail' },
  { id: 'med-new', label: 'Add Medication', route: '/mobile/meds/new', section: 'Meds Detail' },
  { id: 'med-edit', label: 'Edit Medication', route: '/mobile/meds/med1/edit', section: 'Meds Detail' },
  { id: 'med-import', label: 'Import Medication', route: '/mobile/meds/import', section: 'Meds Detail' },

  // ── Form Patterns ────────────────────────────────────
  { id: 'form-inputs', label: 'Form Inputs', route: '/mobile/patterns/inputs', section: 'Form Patterns' },
  { id: 'form-pickers', label: 'Form Pickers', route: '/mobile/patterns/pickers', section: 'Form Patterns' },
  { id: 'form-confirm', label: 'Confirm Sheet', route: '/mobile/patterns/confirm', section: 'Form Patterns' },
  { id: 'form-destructive', label: 'Destructive Dialog', route: '/mobile/patterns/destructive', section: 'Form Patterns' },
];

export const SECTIONS: ScreenSection[] = [
  'Round 0 — Core',
  'Auth & Onboarding',
  'Home Detail',
  'Care',
  'Meds Detail',
  'Form Patterns',
];

export function getScreensBySection(section: ScreenSection): ScreenEntry[] {
  return SCREEN_CATALOG.filter((s) => s.section === section);
}
