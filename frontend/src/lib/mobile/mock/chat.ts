/** Mock data for Chat list and AI conversation screens. */

export const CHAT_TOP_SUBTITLE = 'Care team & AI assistant';

/** Unread count badge on the tab bar (chat list). */
export const CHAT_TAB_UNREAD = 3;

export const CHAT_DATE_CHIP = 'Today';

export const CHAT_COMPOSER_PLACEHOLDER = 'Message HealthOS…';

export const CHAT_CONVERSATIONS = [
  { avatar: 'L', name: 'Dr. Nguyen Lan',       preview: 'Your lab results are in — everything lo…', time: '9:42', unread: 2, role: 'Cardiologist',   color: undefined },
  { avatar: 'T', name: 'Care coordinator',      preview: 'I rescheduled your Friday appointment t…', time: 'Yes',  unread: 0, role: 'Sunrise Clinic', color: 'var(--warm-peach)' },
  { avatar: 'M', name: 'Mom',                   preview: "Don't forget to take your evening pill 💊",  time: 'Mon',  unread: 0, role: 'Family',         color: '#E8BDB7' },
  { avatar: 'P', name: 'Pharmacy — District 1', preview: 'Your refill is ready for pickup',           time: 'Sun',  unread: 0, role: 'Service',        color: '#E7DEA7' },
  { avatar: 'K', name: 'Khoa Tran',             preview: 'Walking buddy for tomorrow?',              time: 'Sat',  unread: 0, role: 'Friend',          color: '#B8F0FA' },
];

export const CHAT_AI_SUGGESTIONS = ['Log symptom', 'Check med', 'Explain report'];

export interface ChatMessage {
  id: number;
  side: 'ai' | 'me';
  text?: string;
  typing?: boolean;
  small?: boolean;
  dataCard?: boolean;
}

export const CHAT_AI_MESSAGES: ChatMessage[] = [
  { id: 1, side: 'ai', text: 'Hi Minh 👋 I noticed your heart rate is trending lower this week. Want to see the details?' },
  { id: 2, side: 'me', text: 'Yes, show me the trend' },
  { id: 3, side: 'ai', dataCard: true, text: "Here's your resting HR for the past 7 days. Average: 68 bpm, down from 72 last week." },
  { id: 4, side: 'ai', small: true, text: 'Based on data from your Fitbit' },
  { id: 5, side: 'me', text: 'Great. Anything I should tell Dr. Nguyen?' },
  { id: 6, side: 'ai', typing: true },
];
