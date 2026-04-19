import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter, type Router } from "expo-router";

interface NotificationData {
  url?: string;
  reminderId?: string;
  conversationId?: string;
  [key: string]: unknown;
}

function routeFromNotification(router: Router, data: NotificationData): void {
  if (data.reminderId) {
    router.push("/(tabs)/more/reminders");
    return;
  }
  if (data.conversationId) {
    router.push({
      pathname: "/(tabs)/chat/[conversationId]",
      params: { conversationId: String(data.conversationId) },
    });
    return;
  }
  if (typeof data.url === "string") {
    const m = data.url.match(/^healthos:\/\/(.+)$/);
    if (!m) return;
    const rest = m[1];
    if (rest && rest.startsWith("reminders/")) {
      router.push("/(tabs)/more/reminders");
    } else if (rest && rest.startsWith("chat/")) {
      const id = rest.slice("chat/".length);
      if (id) {
        router.push({
          pathname: "/(tabs)/chat/[conversationId]",
          params: { conversationId: id },
        });
      }
    }
  }
}

/**
 * Mount-once hook: routes the user to the matching screen when a local
 * notification (created by `src/notifications/scheduler.ts`) is tapped while
 * the app is foreground/background, OR when the app was cold-started by a
 * notification tap.
 */
export function useNotificationDeepLinks(): void {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ??
        {}) as NotificationData;
      routeFromNotification(router, data);
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = (response.notification.request.content.data ??
        {}) as NotificationData;
      routeFromNotification(router, data);
    });
  }, [router]);
}
