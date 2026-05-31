import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { TopBar } from '../layout/top-bar';
import { ApiState } from '../api/api-state';
import { IconBell, IconCalendar, IconTarget, IconActivity, IconCheck } from '../../icons';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import { ROUTES } from '../../lib/routes';
import type { NotificationItem } from '../../../../shared/api-contracts';

const TABS = ['All', 'Reminders', 'Care team', 'Insight'] as const;
type TabKey = typeof TABS[number];

const KIND_MAP: Record<TabKey, string[] | null> = {
  All:        null,
  Reminders:  ['reminder', 'medication', 'medicine'],
  'Care team':['care', 'message', 'appointment'],
  Insight:    ['insight', 'report', 'goal', 'activity', 'data_export'],
};

const MOBILE_ROUTE_PREFIXES = [
  '/auth',
  '/care',
  '/chat',
  '/home',
  '/insights',
  '/me',
  '/meals',
  '/meds',
  '/profile',
  '/reminders',
] as const;

const SAFE_ROUTE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

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

function isAllowedMobilePath(path: string): boolean {
  return MOBILE_ROUTE_PREFIXES.some((prefix) => (
    path === prefix || path.startsWith(`${prefix}/`)
  ));
}

function safeRouteId(value: string): string | null {
  return SAFE_ROUTE_ID_PATTERN.test(value) ? value : null;
}

function dashboardNotificationPath(pathname: string): string | null {
  const medicationPrefix = '/dashboard/medications/';
  if (pathname.startsWith(medicationPrefix)) {
    const id = safeRouteId(pathname.slice(medicationPrefix.length));
    return id ? `/meds/${encodeURIComponent(id)}` : ROUTES.meds;
  }
  if (pathname === '/dashboard/reminders') return ROUTES.reminders;
  if (pathname === '/dashboard/reports') return ROUTES.insights;
  if (pathname === '/dashboard/settings' || pathname === '/dashboard/profile') return ROUTES.me;
  if (pathname === '/dashboard/emergency-card') return ROUTES.me;
  if (pathname === '/dashboard/notifications') return '/reminders/notifications';
  if (pathname === '/dashboard/health') return ROUTES.homeVitals;
  if (pathname === '/dashboard/appointments') return ROUTES.careAppointments;
  const appointmentPrefix = '/dashboard/appointments/';
  if (pathname.startsWith(appointmentPrefix)) {
    const id = safeRouteId(pathname.slice(appointmentPrefix.length));
    return id ? `/care/appointment/${encodeURIComponent(id)}` : ROUTES.careAppointments;
  }
  return null;
}

function mobileNotificationPath(link: string | null): string | null {
  const path = link?.trim();
  if (!path) return null;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null;
  try {
    const parsed = new URL(path, 'https://healthos.local');
    if (parsed.pathname.startsWith('/dashboard/')) {
      return dashboardNotificationPath(parsed.pathname);
    }
    return isAllowedMobilePath(parsed.pathname) ? path : null;
  } catch {
    return null;
  }
}

function actionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function matchesKind(item: Notif, tokens: string[] | null) {
  if (!tokens) return true;
  const kind = item.kind.toLowerCase();
  return tokens.some((token) => kind.includes(token));
}

type Notif = NotificationItem;

function NotifRow({
  n, color, onPress,
}: { n: Notif; color: string; onPress: () => void }) {
  const t = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
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
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsInboxScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const [tab, setTab] = useState<TabKey>('All');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => notificationService.list({ per_page: 100 }), []);
  const notifications = useApiQuery(queryKeys.notifications, load);

  const allList: Notif[] = useMemo(() => notifications.data?.data ?? [], [notifications.data]);

  const filtered = useMemo(() => {
    const match = KIND_MAP[tab];
    if (!match) return allList;
    return allList.filter((item) => matchesKind(item, match));
  }, [allList, tab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { All: 0, Reminders: 0, 'Care team': 0, Insight: 0 };
    counts.All = allList.filter((n) => !n.is_read).length;
    for (const tb of TABS) {
      if (tb === 'All') continue;
      const match = KIND_MAP[tb];
      if (match) counts[tb] = allList.filter((n) => !n.is_read && matchesKind(n, match)).length;
    }
    return counts;
  }, [allList]);

  // Split into NEW (unread today) and EARLIER TODAY
  const newItems     = useMemo(() => filtered.filter((n) => !n.is_read && isToday(n.created_at)), [filtered]);
  const earlierItems = useMemo(() => filtered.filter((n) => n.is_read || !isToday(n.created_at)), [filtered]);

  async function markAllRead() {
    setActionError(null);
    try {
      await notificationService.markAllRead();
      invalidateApiQuery('notifications.');
      void notifications.reload();
    } catch (error) {
      setActionError(actionErrorMessage(error, i18n('reminders.notificationActionFailed')));
    }
  }

  async function markRead(id: string): Promise<boolean> {
    setActionError(null);
    try {
      await notificationService.markRead(id);
      invalidateApiQuery('notifications.');
      void notifications.reload();
      return true;
    } catch (error) {
      setActionError(actionErrorMessage(error, i18n('reminders.notificationActionFailed')));
      return false;
    }
  }

  async function openNotification(item: Notif) {
    if (!item.is_read) {
      await markRead(item.id);
    }
    const path = mobileNotificationPath(item.link);
    if (path) router.push(path as never);
  }

  return (
    <Screen scroll={false} padding={false}>
      <TopBar
        title={i18n('reminders.notificationInbox')}
        subtitle={`${tabCounts.All} ${i18n('reminders.unread')}`}
        right={
          <View style={styles.topBtns}>
            <TouchableOpacity
              accessibilityLabel={i18n('reminders.markAllRead')}
              onPress={markAllRead}
              style={[styles.topIconBtn, { backgroundColor: t.bgElev, borderColor: t.border }]}
            >
              <IconCheck size={16} color={t.ink3} />
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
      {actionError && (
        <Text style={[styles.actionError, { color: t.danger }]}>{actionError}</Text>
      )}

      {notifications.isLoading && <ApiState title={i18n('api.loading')} loading />}
      {notifications.error && (
        <ApiState
          title={i18n('api.unavailable')}
          message={notifications.error.message}
          actionLabel={i18n('common.retry')}
          onAction={notifications.reload}
        />
      )}

      {!notifications.isLoading && !notifications.error && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* NEW section */}
          {newItems.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: t.ink3 }]}>{i18n('reminders.newReminder').toUpperCase()}</Text>
              <View style={[styles.groupCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {newItems.map((n, i) => (
                  <View key={n.id}>
                    <NotifRow n={n} color={catColor(t, n.kind)} onPress={() => openNotification(n)} />
                    {i < newItems.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* EARLIER TODAY section */}
          {earlierItems.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: t.ink3 }]}>{i18n('reminders.today')}</Text>
              <View style={[styles.groupCard, { backgroundColor: t.card, borderColor: t.border }]}>
                {earlierItems.map((n, i) => (
                  <View key={n.id}>
                    <NotifRow n={n} color={catColor(t, n.kind)} onPress={() => openNotification(n)} />
                    {i < earlierItems.length - 1 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
                  </View>
                ))}
              </View>
            </>
          )}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={[typography.bodyMed, { color: t.ink3 }]}>{i18n('reminders.noReminders')}</Text>
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
  actionError: { marginHorizontal: 20, marginBottom: 8, fontSize: 12, lineHeight: 17, fontWeight: '600' },

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

  empty: { alignItems: 'center', paddingTop: 48 },
});
