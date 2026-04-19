import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Reminder, ReminderRepeat } from "@/api/endpoints/reminders";

const STORE_PREFIX = "reminder";
const cancelledTracker = new Map<string, string>();

function tagId(reminderId: string): string {
  return `${STORE_PREFIX}:${reminderId}`;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":").map((part) => parseInt(part, 10));
  return {
    hour: Math.min(23, Math.max(0, isFinite(h ?? NaN) ? (h ?? 0) : 0)),
    minute: Math.min(59, Math.max(0, isFinite(m ?? NaN) ? (m ?? 0) : 0)),
  };
}

/**
 * Returns the next absolute Date in the device's local timezone for a given
 * `HH:MM` — today if it hasn't passed yet, tomorrow otherwise. Used for
 * `repeat="once"` so the notification fires exactly one time instead of
 * silently being upgraded to a daily schedule.
 */
function nextOccurrenceDate(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

function buildTrigger(repeat: ReminderRepeat, time: string):
  | Notifications.NotificationTriggerInput
  | null {
  const { hour, minute } = parseTime(time);
  const isAndroid = Platform.OS === "android";
  const channelOverride = isAndroid ? { channelId: "reminders" as const } : {};

  if (repeat === "once") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextOccurrenceDate(hour, minute),
      ...channelOverride,
    };
  }
  if (repeat === "daily") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...channelOverride,
    };
  }
  if (repeat === "weekly") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      hour,
      minute,
      weekday: 1,
      ...channelOverride,
    };
  }
  if (repeat === "monthly") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      hour,
      minute,
      day: 1,
      ...channelOverride,
    };
  }
  return null;
}

export async function scheduleReminder(reminder: Reminder): Promise<string | null> {
  if (reminder.done) return null;
  const trigger = buildTrigger(reminder.repeat, reminder.time);
  if (!trigger) return null;
  await cancelReminder(reminder.id);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.note ?? `${reminder.type} reminder`,
      data: {
        url: `healthos://reminders/${reminder.id}`,
        reminderId: reminder.id,
      },
      sound: "default",
    },
    trigger,
    identifier: tagId(reminder.id),
  });
  cancelledTracker.set(reminder.id, id);
  return id;
}

export async function cancelReminder(reminderId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(tagId(reminderId));
  } catch {
    // ignore
  }
  cancelledTracker.delete(reminderId);
}

export async function reconcileReminders(reminders: Reminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = new Map(
    reminders.filter((r) => !r.done).map((r) => [tagId(r.id), r])
  );
  for (const notif of scheduled) {
    if (notif.identifier?.startsWith(`${STORE_PREFIX}:`) && !wanted.has(notif.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(
        () => undefined
      );
    }
  }
  for (const reminder of wanted.values()) {
    await scheduleReminder(reminder);
  }
}
