import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Screen } from '../layout/screen';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { invalidateApiQuery, useApiQuery } from '../../api/query';
import { notificationService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';
import type { NotificationPreferences } from '../../../../shared/api-contracts';
import { ChevronLeft } from '../../icons';
import {
  CATEGORY_PREFERENCE_ROWS,
  CHANNEL_PREFERENCE_ROWS,
  CRITICAL_BYPASS_ROW,
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  type NotificationCategoryKey,
  type NotificationChannelKey,
} from './reminder-preferences-contract';
import {
  GroupCard,
  GroupLabel,
  MasterPermissionCard,
  NotificationsOffHero,
  PreferenceDivider,
  PreferenceFeedback,
  PreferenceRow,
  QuietWindowCard,
} from './reminder-preferences-layout';

export { DEFAULT_NOTIFICATION_PREFERENCES } from './reminder-preferences-contract';

type NotificationPermissionState = 'loading' | 'granted' | 'denied' | 'undetermined' | 'unsupported';

function normalizeAndroidVersion() {
  const version = Number(Platform.Version);
  return Number.isNaN(version) ? 0 : version;
}

function buildNotificationPermissionStateLabel(
  status: Exclude<NotificationPermissionState, 'loading'>,
  i18n: (key: string) => string,
) {
  const statusKey = ({
    granted: 'reminders.notificationsPermissionGranted',
    denied: 'reminders.notificationsPermissionDenied',
    undetermined: 'reminders.notificationsPermissionUndetermined',
    unsupported: 'reminders.notificationsPermissionUnsupported',
  })[status];

  return `${i18n('reminders.notificationsPermissionState')}: ${i18n(statusKey)}`;
}

export function ReminderPreferencesScreen() {
  const t = useTheme();
  const { t: i18n } = useTranslation();

  const loadPreferences = useCallback(() => notificationService.preferences(), []);
  const preferences = useApiQuery(queryKeys.notificationPreferences, loadPreferences);

  const [master,       setMaster]       = useState(DEFAULT_NOTIFICATION_PREFERENCES.enabled);
  const [cats,         setCats]         = useState<NotificationPreferences['categories']>(
    () => DEFAULT_NOTIFICATION_PREFERENCES.categories,
  );
  const [channels,     setChannels]     = useState<NotificationPreferences['channels']>(
    () => DEFAULT_NOTIFICATION_PREFERENCES.channels,
  );
  const [criticalBypass, setCriticalBypass] = useState(DEFAULT_NOTIFICATION_PREFERENCES.critical_bypass);
  const [quietStart,     setQuietStart]     = useState(DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours.start);
  const [quietEnd,       setQuietEnd]       = useState(DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours.end);
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [saveSuccess,    setSaveSuccess]    = useState<string | null>(null);
  const [notificationPermissionState, setNotificationPermissionState] =
    useState<NotificationPermissionState>('loading');
  const [permissionBusy, setPermissionBusy] = useState(false);

  const supportsNotificationRuntimePermission =
    Platform.OS === 'android' &&
    normalizeAndroidVersion() >= 33 &&
    Boolean(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

  const notificationPermissionLabel =
    notificationPermissionState === 'loading'
      ? i18n('reminders.notificationsPermissionChecking')
      : buildNotificationPermissionStateLabel(notificationPermissionState, i18n);

  const permissionActionLabel =
    notificationPermissionState === 'granted'
      ? i18n('reminders.notificationsPermissionOpenSettings')
      : i18n('reminders.notificationsPermissionRequest');

  const canOpenSettingsAction = supportsNotificationRuntimePermission && notificationPermissionState === 'granted';

  const refreshNotificationPermissionState = useCallback(async () => {
    if (!supportsNotificationRuntimePermission) {
      setNotificationPermissionState('unsupported');
      return;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      setNotificationPermissionState(hasPermission ? 'granted' : 'undetermined');
    } catch {
      setNotificationPermissionState('undetermined');
    }
  }, [supportsNotificationRuntimePermission]);

  async function openNotificationSettings() {
    await Linking.openSettings();
  }

  async function requestNotificationPermission() {
    if (!supportsNotificationRuntimePermission) {
      await openNotificationSettings();
      return;
    }

    setPermissionBusy(true);
    try {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        setNotificationPermissionState('granted');
      } else if (result === PermissionsAndroid.RESULTS.DENIED) {
        setNotificationPermissionState('denied');
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        setNotificationPermissionState('denied');
        await openNotificationSettings();
      } else {
        setNotificationPermissionState('undetermined');
      }
    } catch {
      setNotificationPermissionState('undetermined');
    } finally {
      setPermissionBusy(false);
    }
  }

  async function handlePermissionAction() {
    if (canOpenSettingsAction) {
      await openNotificationSettings();
      return;
    }

    await requestNotificationPermission();
    await refreshNotificationPermissionState();
  }

  function applyPreferenceState(data: NotificationPreferences | null | undefined) {
    const next = normalizeNotificationPreferences(data);
    setMaster(next.enabled);
    setCats(next.categories);
    setChannels(next.channels);
    setCriticalBypass(next.critical_bypass);
    setQuietStart(next.quiet_hours.start);
    setQuietEnd(next.quiet_hours.end);
  }

  useEffect(() => {
    if (preferences.data) applyPreferenceState(preferences.data);
  }, [preferences.data]);

  useEffect(() => {
    void refreshNotificationPermissionState();
  }, [refreshNotificationPermissionState]);

  function toggleCat(key: NotificationCategoryKey) { setCats((p) => ({ ...p, [key]: !p[key] })); }
  function toggleChannel(key: NotificationChannelKey) { setChannels((p) => ({ ...p, [key]: !p[key] })); }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await notificationService.updatePreferences({
        enabled:     master,
        categories:  cats,
        channels,
        quiet_hours: { start: quietStart, end: quietEnd },
        critical_bypass: criticalBypass,
      });
      invalidateApiQuery('notifications.');
      await preferences.reload();
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const saved = await notificationService.updatePreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      applyPreferenceState(saved);
      invalidateApiQuery('notifications.');
      await preferences.reload();
      setSaveSuccess('Notification preferences reset.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not reset preferences.');
    } finally {
      setSaving(false);
    }
  }

  if (preferences.isLoading && !preferences.data) return <Screen><ApiState title={i18n('api.loading')} loading /></Screen>;
  if (preferences.error && !preferences.data) {
    return (
      <Screen>
        <ApiState
          title={i18n('api.unavailable')}
          message={preferences.error.message}
          actionLabel={i18n('common.retry')}
          onAction={preferences.reload}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <View style={[s.backBar, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={20} color={t.ink} />
          <Text style={[s.backTitle, { color: t.ink }]}>{i18n('reminders.notifications')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <MasterPermissionCard
          value={master}
          onChange={setMaster}
          subtitle={i18n('reminders.notificationsCorePreferenceHint')}
        />
        {supportsNotificationRuntimePermission ? (
          <View style={[s.permissionCard, { borderColor: t.border, backgroundColor: t.card }]}>
            <Text style={[s.permissionTitle, { color: t.ink }]}>{i18n('reminders.notificationsPermissionStateLabel')}</Text>
            <Text style={[s.permissionValue, { color: t.ink3 }]}>{notificationPermissionLabel}</Text>
            <Button
              label={permissionActionLabel}
              onPress={handlePermissionAction}
              disabled={permissionBusy || notificationPermissionState === 'loading'}
              style={s.permissionAction}
              variant="text"
              labelColor={t.brand}
            />
          </View>
        ) : null}
        {!master && <NotificationsOffHero onEnable={() => setMaster(true)} />}

        <GroupLabel text={i18n('reminders.preferences')} />
        <GroupCard>
          {CATEGORY_PREFERENCE_ROWS.map((row, i) => (
            <View key={row.key}>
              <PreferenceRow row={row} value={cats[row.key] ?? true} masterEnabled={master} onToggle={() => toggleCat(row.key)} />
              {i < CATEGORY_PREFERENCE_ROWS.length - 1 && <PreferenceDivider />}
            </View>
          ))}
        </GroupCard>

        <GroupLabel text="Critical alerts" />
        <GroupCard>
          <PreferenceRow
            row={CRITICAL_BYPASS_ROW}
            value={criticalBypass}
            masterEnabled={master}
            onToggle={() => setCriticalBypass((next) => !next)}
          />
        </GroupCard>

        <GroupLabel text={i18n('reminders.quietHours')} />
        <QuietWindowCard start={quietStart} end={quietEnd} masterEnabled={master} />

        <GroupLabel text="Channels" />
        <GroupCard>
          {CHANNEL_PREFERENCE_ROWS.map((row, i) => (
            <View key={row.key}>
              <PreferenceRow row={row} value={channels[row.key] ?? true} masterEnabled={master} onToggle={() => toggleChannel(row.key)} />
              {i < CHANNEL_PREFERENCE_ROWS.length - 1 && <PreferenceDivider />}
            </View>
          ))}
        </GroupCard>

        <PreferenceFeedback error={saveError} success={saveSuccess} />

        <Button
          label={saving ? i18n('reminders.saving') : i18n('common.save')}
          onPress={handleSave}
          disabled={saving}
          style={{ marginHorizontal: 20, marginTop: 8 }}
        />
        <Button
          label={i18n('reminders.resetToDefaults')}
          variant="text"
          onPress={handleReset}
          disabled={saving}
          style={s.resetBtn}
          labelColor={t.ink3}
        />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  backBar:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTitle: { ...typography.h3 },
  resetBtn: { marginHorizontal: 20, marginTop: 6 },
  permissionCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    gap: 8,
  },
  permissionTitle: { ...typography.bodyMed },
  permissionValue: { ...typography.caption, lineHeight: 18 },
  permissionAction: { alignSelf: 'flex-start' as const },
});
