import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/Screen';
import { TopBar } from '../layout/TopBar';
import { ApiState } from '../api/ApiState';
import { IconBell, IconCalendar, IconTarget, IconActivity } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';

const TABS = ['All', 'Medication', 'Appointment', 'Goals'];
const KIND_MAP: Record<string, string> = {
  Medication: 'medication',
  Appointment: 'appointment',
  Goals: 'goal',
};

function toRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const delta = Date.now() - date.getTime();
  const min = Math.floor(delta / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;
  const day = Math.floor(hour / 24);
  return `${day}d ago`;
}

function NotifIcon({ kind, color }: { kind: string; color: string }) {
  const s = 16;
  if (kind.includes('appointment')) return <IconCalendar size={s} color={color} />;
  if (kind.includes('goal')) return <IconTarget size={s} color={color} />;
  if (kind.includes('activity')) return <IconActivity size={s} color={color} />;
  return <IconBell size={s} color={color} />;
}

export function NotificationsInboxScreen() {
  const t = useTheme();
  const [tab, setTab] = useState('All');

  const load = useCallback(() => notificationService.list({ per_page: 100 }), []);
  const notifications = useApiQuery(queryKeys.notifications, load);

  const filtered = useMemo(() => {
    const list = notifications.data?.data ?? [];
    if (tab === 'All') return list;
    const match = KIND_MAP[tab];
    return list.filter((item) => item.kind.toLowerCase().includes(match));
  }, [notifications.data, tab]);

  function catColor(kind: string) {
    const lower = kind.toLowerCase();
    if (lower.includes('goal')) return t.success;
    if (lower.includes('appointment')) return t.brand;
    if (lower.includes('activity')) return t.warning;
    return t.brand;
  }

  async function markAllRead() {
    await notificationService.markAllRead();
    invalidateApiQuery('notifications.');
    notifications.reload();
  }

  async function markRead(id: string) {
    await notificationService.markRead(id);
    invalidateApiQuery('notifications.');
    notifications.reload();
  }

  return (
    <Screen>
      <TopBar
        title="Notifications"
        right={
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[typography.body, { color: t.brand }]}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.tabBar}>
        {TABS.map((tb) => (
          <TouchableOpacity key={tb} onPress={() => setTab(tb)} style={[styles.tabItem, tab === tb && { borderBottomColor: t.brand, borderBottomWidth: 2 }]}>
            <Text style={[typography.body, { color: tab === tb ? t.brand : t.ink3, fontWeight: tab === tb ? '600' : '400' }]}>{tb}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {notifications.isLoading && <ApiState title="Loading notifications" loading />}
      {notifications.error && <ApiState title="Notifications unavailable" message={notifications.error.message} actionLabel="Retry" onAction={notifications.reload} />}

      {filtered.map((n) => (
        <TouchableOpacity
          key={n.id}
          onPress={() => { markRead(n.id); }}
          style={[styles.notifRow, { backgroundColor: n.is_read ? t.card : `${t.brand}10`, borderColor: n.is_read ? t.border : `${t.brand}30` }]}
          activeOpacity={0.75}
        >
          {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: t.brand }]} />}
          <View style={[styles.iconCircle, { backgroundColor: `${catColor(n.kind)}15` }]}>
            <NotifIcon kind={n.kind} color={catColor(n.kind)} />
          </View>
          <View style={styles.notifContent}>
            <Text style={[typography.bodyMed, { color: t.ink, fontWeight: n.is_read ? '400' : '600' }]}>{n.title}</Text>
            <Text style={[typography.body, { color: t.ink3 }]}>{n.body}</Text>
          </View>
          <View style={styles.notifRight}>
            <Text style={[typography.micro, { color: t.ink3, marginBottom: 8 }]}>{toRelative(n.created_at)}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {!notifications.isLoading && !notifications.error && filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={[typography.bodyMed, { color: t.ink3 }]}>No notifications in this category.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'transparent', marginBottom: 8 },
  tabItem:      { flex: 1, alignItems: 'center', paddingVertical: 10 },
  notifRow:     { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  unreadDot:    { width: 7, height: 7, borderRadius: 4, marginTop: 8, marginRight: 8 },
  iconCircle:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  notifContent: { flex: 1 },
  notifRight:   { alignItems: 'flex-end', marginLeft: 8 },
  empty:        { alignItems: 'center', paddingTop: 40 },
});
