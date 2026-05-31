import type { ComponentType } from 'react';
import type { NotificationPreferences } from '../../../../shared/api-contracts';
import {
  IconActivity,
  IconAlert,
  IconBell,
  IconCalendar,
  IconHeart,
  IconStethoscope,
  IconTarget,
} from '../../icons';

export type NotificationCategoryKey = keyof NotificationPreferences['categories'];
export type NotificationChannelKey = keyof NotificationPreferences['channels'];

export type ReminderPreferenceRowConfig<TKey extends string = string> = {
  key: TKey;
  label: string;
  sub: string;
  Icon: ComponentType<{ size: number; color: string }>;
  critical?: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    med: true,
    appt: true,
    vitals: true,
    activity: true,
    goal: true,
  },
  channels: {
    push: true,
    sound: true,
    haptics: false,
  },
  quiet_hours: { start: '22:00', end: '07:00' },
  critical_bypass: false,
  snooze_options: [5, 10, 30],
};

export function normalizeNotificationPreferences(
  data: NotificationPreferences | null | undefined,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...data,
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...(data?.categories ?? {}),
    },
    channels: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.channels,
      ...(data?.channels ?? {}),
    },
    quiet_hours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours,
      ...(data?.quiet_hours ?? {}),
    },
    snooze_options: data?.snooze_options ?? DEFAULT_NOTIFICATION_PREFERENCES.snooze_options,
  };
}

export const CATEGORY_PREFERENCE_ROWS: ReminderPreferenceRowConfig<NotificationCategoryKey>[] = [
  { key: 'med', label: 'Medication reminders', sub: 'Push, sound, lock screen', Icon: IconBell },
  { key: 'appt', label: 'Appointments', sub: 'Push · 1d, 1h, 15m', Icon: IconCalendar },
  { key: 'vitals', label: 'Vitals checks', sub: 'Push · weekdays', Icon: IconHeart },
  { key: 'goal', label: 'Goals & streaks', sub: 'Push · weekly summary', Icon: IconTarget },
  { key: 'activity', label: 'Activity nudges', sub: 'Off', Icon: IconActivity },
];

export const CRITICAL_BYPASS_ROW: ReminderPreferenceRowConfig<'critical_bypass'> = {
  key: 'critical_bypass',
  label: 'Critical alert bypass',
  sub: 'Allow urgent care alerts during quiet hours',
  Icon: IconStethoscope,
  critical: true,
};

export const CHANNEL_PREFERENCE_ROWS: ReminderPreferenceRowConfig<NotificationChannelKey>[] = [
  { key: 'push', label: 'Push', sub: 'Lock screen + banners', Icon: IconBell },
  { key: 'sound', label: 'Sound', sub: 'Default · soft tone', Icon: IconAlert },
  { key: 'haptics', label: 'Haptics', sub: 'Subtle vibration', Icon: IconHeart },
];
