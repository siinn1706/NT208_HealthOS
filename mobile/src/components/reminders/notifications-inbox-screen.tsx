import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { IconBell, IconCalendar, IconTarget, IconActivity, IconCheck, IconMore } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';

const TABS = ['All', 'Reminders', 'Care team', 'Insight'] as const;
type TabKey = typeof TABS[number];

const KIND_MAP: Record<TabKey, string | null> = {
  All:        null,
  Reminders:  'medication',
  'Care team':'care',
  Insight:    'insight',
};

function toRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const delta = Date.now() - date.getTime();
  const min   = Math.floor(delta / 60000);
  if (min < 1)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h ago`;
  return `${Math.floor(hour / 24)}d ago`;
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

function NotifIcon({ kind, color }: { kind: string; color: string }) {
  const s = 16;
  if (kind.includes('appointment')) return <IconCalendar size={s} color={color} />;
  if (kind.includes('goal'))        return <IconTarget   size={s} color={color} />;
  if (kind.includes('activity'))    return <IconActivity size={s} color={color} />;
  return <IconBell size={s} color={color} />;
}

function catColor(t: ReturnType<typeof useTheme>, kind: string) {
  const k = kind.toLowerCase();
  if (k.includes('goal'))        return t.success;
  if (k.includes('appointment')) return t.brand;
  if (k.includes('activity'))    return t.warning;
  return t.brand;
}

// Inline action buttons derived from notification kind
function inlineActions(kind: string): string[] {
  const k = kind.toLowerCase();
  if (k.includes('medication') || k.includes('medicine')) return ['Take', 'Skip'];
  if (k.includes('appointment')) return ['View'];
  if (k.includes('message') || k.includes('care')) return ['Reply'];
  return [];
}

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

function NotifRow({
  n, color, onRead,
}: { n: Notif; color: string; onRead: () => void }) {
  const t = useTheme();
  const actions = inlineActions(n.kind);

  return (
    <TouchableOpacity
      onPress={onRead}
      activeOpacity={0.75}
      style={[styles.notifRow, { backgroundColor: n.is_read ? 'transparent' : `${t.brand}06` }]}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: t.brand }]} />
      )}

      {/* Icon cell */}
      <View style={[styles.iconCell, { backgroundColor: `${color}14`, borderRadius: 11 }]}>
        <NotifIcon kind={n.kind} color={color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text
            style={[styles.notifTitle, { color: t.ink, fontWeight: n.is_read ? '500' : '700' }]}
            numberOfLines={1}
          >
            {n.title}
          </Text>
          <Text style={[styles.notifTime, { color: t.ink4 }]}>{toRelative(n.created_at)}</Text>
        </View>
        <Text style={[styles.notifBody, { color: t.ink3 }]} numberOfLines={2}>{n.body}</Text>

        {/* Inline action buttons */}
        {!n.is_read && actions.length > 0 && (
          <View style={styles.actionRow}>
            {actions.map((label) => (
              <TouchableOpacity
                key={label}
                onPress={onRead}
                style={[styles.miniBtn, { backgroundColor: t.bgElev, borderColor: t.border }]}
              >
                <Text style={[styles.miniBtnText, { color: t.ink }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsInboxScreen() {
  const t = useTheme();
  const [tab, setTab] = useState<TabKey>('All');

  const load = useCallback(() => notificationService.list({ per_page: 100 }), []);
  const notifications = useApiQuery(queryKeys.notifications, load);

  const allList: Notif[] = useMemo(() => notifications.data?.data ?? [], [notifications.data]);

  const filtered = useMemo(() => {
    const match = KIND_MAP[tab];
    if (!match) return allList;
    return allList.filter((item) => item.kind.toLowerCase().includes(match));
  }, [allList, tab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { All: 0, Reminders: 0, 'Care team': 0, Insight: 0 };
    counts.All = allList.filter((n) => !n.is_read).length;
    for (const tb of TABS) {
      if (tb === 'All') continue;
      const match = KIND_MAP[tb];
      if (match) counts[tb] = allList.filter((n) => !n.is_read && n.kind.toLowerCase().includes(match)).length;
    }
    return counts;
  }, [allList]);

  // Split into NEW (unread today) and EARLIER TODAY
  const newItems     = useMemo(() => filtered.filter((n) => !n.is_read && isToday(n.created_at)), [filtered]);
  const earlierItems = useMemo(() => filtered.filter((n) => n.is_read || !isToday(n.created_at)), [filtered]);

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
    <Screen scroll={false} padding={false}>
      <TopBar
        title="Notifications"
        subtitle={`${tabCounts.All} unread · all caught up tomorrow`}
        right={
          <View style={styles.topBtns}>
            <TouchableOpacity
              onPress={markAllRead}
              style={[styles.topIconBtn, { backgroundColor: t.bgElev, borderColor: t.border }]}
            >
              <IconCheck size={16} color={t.ink3} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topIconBtn, { backgroundColor: t.bgElev, borderColor: t.border }]}>
              <IconMore size={16} color={t.ink3} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Pill tabs with count badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tb) => {
          const active = tab === tb;
          const count  = tabCounts[tb];
          return (
            <TouchableOpacity
              key={tb}
              onPress={() => setTab(tb)}
              style={[
                styles.tabPill,
                {
                  backgroundColor: active ? t.brand : 'transparent',
                  borderColor:     active ? t.brand : t.border,
                },
              ]}
            >
              <Text style={[styles.tabPillText, { color: active ? '#fff' : t.ink3 }]}>{tb}</Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${t.brand}20` }]}>
                  <Text style={[styles.countBadgeText, { color: active ? '#fff' : t.brand }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {notifications.isLoading && <ApiState title="Loading notifications" loading />}
      {notifications.error && (
        <ApiState
          title="Notifications unavailable"
          message={notifications.error.message}
          actionLabel="Retry"
          onAction={notifications.reload}
        />
      )}

      {!notifications.isLoading && !notifications.error && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* NEW section */}
          {newItems.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: t.ink3 }]}>NEW</Text>
              <View style={[styles.groupCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {newItems.map((n, i) => (
                  <View key={n.id}>
                    <NotifRow n={n} color={catColor(t, n.kind)} onRead={() => markRead(n.id)} />
                    {i < newItems.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* EARLIER TODAY section */}
          {earlierItems.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: t.ink3 }]}>EARLIER TODAY</Text>
              <View style={[styles.groupCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {earlierItems.map((n, i) => (
                  <View key={n.id}>
                    <NotifRow n={n} color={catColor(t, n.kind)} onRead={() => markRead(n.id)} />
                    {i < earlierItems.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={[typography.bodyMed, { color: t.ink3 }]}>No notifications in this category.</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // top bar buttons
  topBtns:    { flexDirection: 'row', gap: 8 },
  topIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // tabs
  tabScroll:   { flexGrow: 0, marginBottom: 4 },
  tabContent:  { paddingHorizontal: 20, gap: 8, paddingVertical: 8 },
  tabPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  tabPillText: { fontSize: 13, fontWeight: '600' },
  countBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  countBadgeText: { fontSize: 11, fontWeight: '700' },

  // list
  listContent:  { paddingHorizontal: 20, paddingTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  groupCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  divider:      { height: StyleSheet.hairlineWidth, marginLeft: 68 },

  // notification row
  notifRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  unreadDot:    { width: 7, height: 7, borderRadius: 4, marginTop: 5, marginRight: 6, flexShrink: 0 },
  iconCell:     { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTitleRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  notifTitle:   { flex: 1, fontSize: 13, lineHeight: 18 },
  notifTime:    { fontSize: 10, flexShrink: 0, marginTop: 2 },
  notifBody:    { fontSize: 12, lineHeight: 17, marginTop: 3 },

  // inline actions
  actionRow:    { flexDirection: 'row', gap: 8, marginTop: 8 },
  miniBtn:      { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  miniBtnText:  { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 48 },
});
