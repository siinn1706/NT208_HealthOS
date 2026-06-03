import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiState } from '../api/api-state';
import { Button } from '../primitives/button';
import { Card } from '../primitives/card';
import { IconLock, IconShield } from '../../icons';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import {
  appLockUnavailableMessage,
  authenticateAppLock,
  getAppLockAvailability,
  isAppLockEnabled,
  setAppLockEnabled,
  type AppLockAvailability,
} from '../../auth/app-lock-service';

export function AppLockSecurityCard() {
  const t = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [availability, setAvailability] = useState<AppLockAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const [nextEnabled, nextAvailability] = await Promise.all([
      isAppLockEnabled(),
      getAppLockAvailability(),
    ]);
    setEnabled(nextEnabled);
    setAvailability(nextAvailability);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function enableAppLock() {
    setBusy(true);
    setFeedback(null);
    try {
      const nextAvailability = await getAppLockAvailability();
      setAvailability(nextAvailability);
      if (!nextAvailability.available) {
        setFeedback(appLockUnavailableMessage(nextAvailability.reason));
        return;
      }
      const ok = await authenticateAppLock('Enable HealthOS app lock');
      if (!ok) {
        setFeedback('App lock was not enabled because unlock was cancelled or failed.');
        return;
      }
      await setAppLockEnabled(true);
      setEnabled(true);
      setFeedback('App lock enabled. HealthOS will require local authentication after restart or resume.');
    } finally {
      setBusy(false);
    }
  }

  async function disableAppLock() {
    setBusy(true);
    setFeedback(null);
    try {
      const nextAvailability = await getAppLockAvailability();
      setAvailability(nextAvailability);
      const ok = nextAvailability.available
        ? await authenticateAppLock('Disable HealthOS app lock')
        : true;
      if (!ok) {
        setFeedback('App lock remains enabled because unlock was cancelled or failed.');
        return;
      }
      await setAppLockEnabled(false);
      setEnabled(false);
      setFeedback('App lock disabled.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ApiState title="Loading app lock" loading />;

  const available = Boolean(availability?.available);
  const methods = availability?.methods.length ? availability.methods.join(', ') : 'Unavailable';
  const status = enabled ? 'ON' : available ? 'READY' : 'UNAVAILABLE';
  const badgeColor = enabled ? t.success : available ? t.brand : t.warning;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${badgeColor}18` }]}>
          <IconShield size={18} color={badgeColor} />
        </View>
        <View style={styles.copy}>
          <Text style={[typography.bodyMed, { color: t.ink, fontWeight: '700' }]}>App lock</Text>
          <Text style={[typography.micro, { color: t.ink3, marginTop: 2 }]}>
            {available
              ? `${methods} · ${availability?.securityLevel ?? 'Local authentication'}`
              : appLockUnavailableMessage(availability?.reason)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${badgeColor}18` }]}>
          <Text style={[typography.micro, { color: badgeColor, fontWeight: '800' }]}>{status}</Text>
        </View>
      </View>
      <Button
        label={busy ? 'Working...' : enabled ? 'Disable app lock' : 'Enable app lock'}
        variant={enabled ? 'ghost' : 'soft'}
        icon={<IconLock size={16} color={enabled ? t.ink : t.brand} />}
        disabled={busy || (!enabled && !available)}
        onPress={enabled ? disableAppLock : enableAppLock}
      />
      {feedback && (
        <Text style={[typography.caption, { color: enabled ? t.success : t.ink3 }]}>{feedback}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
});
