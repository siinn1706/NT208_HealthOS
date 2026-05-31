/**
 * Modal components used exclusively by the Me (profile) tab screen.
 * Extracted to keep me.tsx under 200 lines.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useThemeContext } from '../../theme/theme-provider';
import { typography } from '../../theme/typography';
import { IconCheck } from '../../icons';
import { ApiState } from '../api/api-state';
import { EmergencyCard } from './emergency-card';
import { Button } from '../primitives/button';
import { Toggle } from '../primitives/toggle';
import { Input } from '../primitives/input/input';
import { Card } from '../primitives/card';
import { useApiQuery, invalidateApiQuery } from '../../api/query';
import { queryKeys } from '../../api/queryKeys';
import { preferenceService } from '../../api/services/preference-service';
import {
  preferenceToThemeSelection,
  themeSelectionToPreference,
  type ThemeSelection,
} from '../../theme/theme-preference-mapping';
import {
  emergencyService,
  type AssistanceNeed,
  type EmergencyProfileOwnerView,
  type EmergencyShareTokenWithSecret,
} from '../../api/services/emergency-service';

const HANDLE_OFFSET = 12;
const ASSISTANCE_OPTIONS: AssistanceNeed[] = ['walking', 'communication', 'dietary', 'hearing', 'vision', 'cognitive'];
const VISIBILITY_OPTIONS = [
  { key: 'blood_type', label: 'Blood type' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'medications', label: 'Medications' },
  { key: 'contacts', label: 'Emergency contacts' },
  { key: 'communication', label: 'Communication notes' },
] as const;

type EmergencyDraft = {
  is_published: boolean;
  nkda_confirmed: boolean;
  preferred_language: string;
  equipment_notes: string;
  communication_notes: string;
  assistance_needed: AssistanceNeed[];
  field_visibility: Record<string, boolean>;
};

function SheetHandle() {
  const t = useTheme();
  return <View style={[styles.handle, { backgroundColor: t.border }]} />;
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.sheetHeader}>
      <Text style={[typography.h3, { color: t.ink }]}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={[typography.caption, { color: t.brand }]}>Close</Text>
      </Pressable>
    </View>
  );
}

const THEME_OPTIONS: { key: ThemeSelection; label: string; desc: string }[] = [
  { key: 'calm', label: 'Calm Clinic', desc: 'Saved as light mode with calm accent' },
  { key: 'night', label: 'Night Sky', desc: 'Saved as dark mode' },
  { key: 'warm', label: 'Warm Care', desc: 'Saved as light mode with warm accent' },
  { key: 'system', label: 'System', desc: 'Follows device setting' },
];

function toEmergencyDraft(profile: EmergencyProfileOwnerView): EmergencyDraft {
  return {
    is_published: profile.is_published,
    nkda_confirmed: profile.nkda_confirmed,
    preferred_language: profile.preferred_language ?? '',
    equipment_notes: profile.equipment_notes ?? '',
    communication_notes: profile.communication_notes ?? '',
    assistance_needed: profile.assistance_needed ?? [],
    field_visibility: profile.field_visibility ?? {},
  };
}

export function AppearanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { name, setTheme } = useThemeContext();
  const preferences = useApiQuery(queryKeys.preferences, () => preferenceService.me(), { enabled: visible });
  const [savingTheme, setSavingTheme] = useState<ThemeSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedTheme = preferences.data ? preferenceToThemeSelection(preferences.data) : name;

  async function chooseTheme(nextTheme: ThemeSelection) {
    if (savingTheme) return;
    const previousTheme = selectedTheme;
    setSavingTheme(nextTheme);
    setError(null);
    setTheme(nextTheme);
    try {
      await preferenceService.update(themeSelectionToPreference(nextTheme));
      invalidateApiQuery(queryKeys.preferences);
      onClose();
    } catch (err) {
      setTheme(previousTheme);
      setError(err instanceof Error ? err.message : 'Could not save appearance preference.');
    } finally {
      setSavingTheme(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <SheetHandle />
        <Text style={[typography.h3, { color: t.ink, margin: 20, marginBottom: 12 }]}>Appearance</Text>
        {preferences.error && (
          <ApiState title="Appearance preference unavailable" message={preferences.error.message} actionLabel="Retry" onAction={preferences.reload} />
        )}
        {THEME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            disabled={Boolean(savingTheme)}
            onPress={() => { void chooseTheme(opt.key); }}
            style={[styles.themeRow, { borderBottomColor: t.border }]}
          >
            <View style={styles.themeInfo}>
              <Text style={[typography.bodyMed, { color: t.ink }]}>{opt.label}</Text>
              <Text style={[typography.caption, { color: t.ink3 }]}>{opt.desc}</Text>
            </View>
            {savingTheme === opt.key ? (
              <Text style={[typography.caption, { color: t.brand }]}>Saving</Text>
            ) : selectedTheme === opt.key ? (
              <IconCheck size={18} color={t.brand} />
            ) : null}
          </Pressable>
        ))}
        {error && <ApiState title="Appearance update failed" message={error} />}
      </View>
    </Modal>
  );
}

export function EmergencySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const profileQuery = useApiQuery(queryKeys.emergencyProfile, () => emergencyService.profile(), { enabled: visible });
  const tokensQuery = useApiQuery(queryKeys.emergencyTokens, () => emergencyService.listTokens(), { enabled: visible });
  const logsQuery = useApiQuery(queryKeys.emergencyAccessLogs, () => emergencyService.accessLogs({ limit: 8 }), { enabled: visible });
  const [draft, setDraft] = useState<EmergencyDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [busyTokenId, setBusyTokenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [freshShare, setFreshShare] = useState<EmergencyShareTokenWithSecret | null>(null);

  useEffect(() => {
    if (profileQuery.data) setDraft(toEmergencyDraft(profileQuery.data));
  }, [profileQuery.data]);

  const activeTokens = useMemo(() => (tokensQuery.data ?? []).filter((token) => token.is_active), [tokensQuery.data]);

  function toggleAssistance(item: AssistanceNeed) {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.assistance_needed.includes(item);
      return {
        ...prev,
        assistance_needed: has
          ? prev.assistance_needed.filter((value) => value !== item)
          : [...prev.assistance_needed, item],
      };
    });
  }

  function toggleVisibility(key: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        field_visibility: {
          ...prev.field_visibility,
          [key]: !(prev.field_visibility[key] ?? true),
        },
      };
    });
  }

  async function saveProfile() {
    if (!draft) return;
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await emergencyService.updateProfile({
        is_published: draft.is_published,
        nkda_confirmed: draft.nkda_confirmed,
        preferred_language: draft.preferred_language.trim() || null,
        equipment_notes: draft.equipment_notes.trim() || null,
        communication_notes: draft.communication_notes.trim() || null,
        assistance_needed: draft.assistance_needed,
        field_visibility: draft.field_visibility,
      });
      invalidateApiQuery(queryKeys.emergencyProfile);
      await profileQuery.reload();
      setActionSuccess('Emergency profile updated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update emergency profile.');
    } finally {
      setSaving(false);
    }
  }

  async function createShareToken() {
    setSharing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const payload = await emergencyService.createToken({
        label: `Mobile ${new Date().toLocaleString()}`,
        acknowledge_low_completeness: true,
      });
      setFreshShare(payload);
      invalidateApiQuery(queryKeys.emergencyTokens);
      await tokensQuery.reload();
      setActionSuccess('Share token created. Keep this URL private.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create share token.');
    } finally {
      setSharing(false);
    }
  }

  async function revokeToken(tokenId: string) {
    setBusyTokenId(tokenId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await emergencyService.revokeToken(tokenId);
      invalidateApiQuery(queryKeys.emergencyTokens);
      await tokensQuery.reload();
      setActionSuccess('Token revoked.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not revoke token.');
    } finally {
      setBusyTokenId(null);
    }
  }

  async function revokeAll() {
    setRevokingAll(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await emergencyService.revokeAllTokens();
      invalidateApiQuery(queryKeys.emergencyTokens);
      await tokensQuery.reload();
      setActionSuccess('All active tokens revoked.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not revoke all tokens.');
    } finally {
      setRevokingAll(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, borderTopLeftRadius: t.radius.xxl, borderTopRightRadius: t.radius.xxl }]}>
        <SheetHandle />
        <SheetHeader title="Emergency Info" onClose={onClose} />

        <ScrollView contentContainerStyle={styles.emergencyPad} showsVerticalScrollIndicator={false}>
          <EmergencyCard variant="soft" onShare={createShareToken} />

          {actionError && <ApiState title="Emergency action failed" message={actionError} />}
          {actionSuccess && (
            <Text style={[typography.micro, { color: t.success, marginTop: 6, marginBottom: 4 }]}>
              {actionSuccess}
            </Text>
          )}

          {profileQuery.isLoading && !draft && <ApiState title="Loading emergency profile" loading />}
          {profileQuery.error && !draft && (
            <ApiState
              title="Emergency profile unavailable"
              message={profileQuery.error.message}
              actionLabel="Retry"
              onAction={profileQuery.reload}
            />
          )}

          {draft && (
            <Card style={styles.blockCard}>
              <View style={styles.rowBetween}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>Published</Text>
                <Toggle value={draft.is_published} onChange={(next) => setDraft({ ...draft, is_published: next })} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={[typography.bodyMed, { color: t.ink }]}>No known drug allergies (NKDA)</Text>
                <Toggle value={draft.nkda_confirmed} onChange={(next) => setDraft({ ...draft, nkda_confirmed: next })} />
              </View>
              <Input
                label="Preferred language"
                value={draft.preferred_language}
                onChangeText={(text) => setDraft({ ...draft, preferred_language: text })}
                placeholder="en"
              />
              <Input
                label="Equipment notes"
                value={draft.equipment_notes}
                onChangeText={(text) => setDraft({ ...draft, equipment_notes: text })}
                placeholder="Wheelchair, oxygen support..."
              />
              <Input
                label="Communication notes"
                value={draft.communication_notes}
                onChangeText={(text) => setDraft({ ...draft, communication_notes: text })}
                placeholder="Preferred communication guidance..."
              />
            </Card>
          )}

          {draft && (
            <Card style={styles.blockCard}>
              <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Assistance needed</Text>
              {ASSISTANCE_OPTIONS.map((item) => (
                <View key={item} style={styles.rowBetween}>
                  <Text style={[typography.body, { color: t.ink }]}>{item.replace(/_/g, ' ')}</Text>
                  <Toggle value={draft.assistance_needed.includes(item)} onChange={() => toggleAssistance(item)} />
                </View>
              ))}
            </Card>
          )}

          {draft && (
            <Card style={styles.blockCard}>
              <Text style={[typography.bodyMed, { color: t.ink, marginBottom: 8 }]}>Field visibility</Text>
              {VISIBILITY_OPTIONS.map((item) => (
                <View key={item.key} style={styles.rowBetween}>
                  <Text style={[typography.body, { color: t.ink }]}>{item.label}</Text>
                  <Toggle value={draft.field_visibility[item.key] ?? true} onChange={() => toggleVisibility(item.key)} />
                </View>
              ))}
              <Button
                label={saving ? 'Saving…' : 'Save emergency profile'}
                variant="solid"
                onPress={saveProfile}
                disabled={saving}
                style={{ marginTop: 8 }}
              />
            </Card>
          )}

          <Card style={styles.blockCard}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Share tokens</Text>
            <Text style={[typography.micro, { color: t.ink3, marginTop: 3 }]}>
              Active tokens: {activeTokens.length}
            </Text>
            <View style={styles.buttonRow}>
              <Button label={sharing ? 'Creating…' : 'Create token'} variant="soft" onPress={createShareToken} disabled={sharing} style={styles.halfButton} />
              <Button
                label={revokingAll ? 'Revoking…' : 'Revoke all'}
                variant="ghost"
                onPress={revokeAll}
                disabled={revokingAll || activeTokens.length === 0}
                style={styles.halfButton}
              />
            </View>

            {freshShare && (
              <View style={[styles.sharePayload, { borderColor: t.border, backgroundColor: t.bgElev }]}>
                <Text style={[typography.micro, { color: t.ink2 }]}>One-time token</Text>
                <Text selectable style={[typography.micro, { color: t.ink, marginTop: 2 }]}>{freshShare.token}</Text>
                <Text style={[typography.micro, { color: t.ink2, marginTop: 8 }]}>Share URL</Text>
                <Text selectable style={[typography.micro, { color: t.ink, marginTop: 2 }]}>{freshShare.share_url}</Text>
              </View>
            )}

            {tokensQuery.isLoading && <ApiState title="Loading tokens" loading />}
            {tokensQuery.error && <ApiState title="Token list unavailable" message={tokensQuery.error.message} actionLabel="Retry" onAction={tokensQuery.reload} />}
            {!tokensQuery.isLoading && !tokensQuery.error && (tokensQuery.data?.length ?? 0) === 0 && (
              <ApiState title="No tokens yet" message="Create a token to share your emergency card." />
            )}
            {!tokensQuery.isLoading && !tokensQuery.error && (tokensQuery.data?.length ?? 0) > 0 && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {tokensQuery.data?.map((token) => (
                  <View key={token.id} style={[styles.tokenRow, { borderColor: t.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyMed, { color: t.ink }]}>{token.label}</Text>
                      <Text style={[typography.micro, { color: t.ink3 }]}>
                        {token.is_active ? 'Active' : 'Revoked'} · {token.access_count} scans
                      </Text>
                    </View>
                    <Button
                      label={busyTokenId === token.id ? 'Revoking…' : 'Revoke'}
                      variant="ghost"
                      onPress={() => revokeToken(token.id)}
                      disabled={!token.is_active || busyTokenId === token.id}
                    />
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.blockCard}>
            <Text style={[typography.bodyMed, { color: t.ink }]}>Access logs</Text>
            {logsQuery.isLoading && <ApiState title="Loading access logs" loading />}
            {logsQuery.error && <ApiState title="Access logs unavailable" message={logsQuery.error.message} actionLabel="Retry" onAction={logsQuery.reload} />}
            {!logsQuery.isLoading && !logsQuery.error && (logsQuery.data?.length ?? 0) === 0 && (
              <ApiState title="No access logs yet" message="Public access events will appear here after card scans." />
            )}
            {!logsQuery.isLoading && !logsQuery.error && (logsQuery.data?.length ?? 0) > 0 && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {logsQuery.data?.map((entry) => (
                  <View key={entry.id} style={[styles.logRow, { borderColor: t.border }]}>
                    <Text style={[typography.micro, { color: t.ink2 }]}>
                      {new Date(entry.accessed_at).toLocaleString()}
                    </Text>
                    <Text style={[typography.micro, { color: t.ink3 }]}>
                      {entry.ip_truncated ?? 'Unknown network'} · token {entry.token_id.slice(0, 8)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function SignOutModal({
  visible,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={[styles.overlay, styles.centered]}>
        <View style={[styles.dialog, { backgroundColor: t.card, borderRadius: t.radius.xl }]}>
          <Text style={[typography.h3, { color: t.ink, marginBottom: 8 }]}>Sign out?</Text>
          <Text style={[typography.body, { color: t.ink3, marginBottom: 20 }]}>
            You will need to sign in again to access your health data.
          </Text>
          {error && (
            <Text style={[typography.caption, { color: t.danger, marginBottom: 12 }]}>{error}</Text>
          )}
          <View style={styles.dialogActions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.dialogBtn} />
            <Button
              label={loading ? 'Signing out…' : 'Sign out'}
              variant="solid"
              onPress={onConfirm}
              style={[styles.dialogBtn, { backgroundColor: t.danger }]}
            />
          </View>
          {loading && <ActivityIndicator color={t.brand} style={{ marginTop: 12 }} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  centered: { justifyContent: 'center' },
  sheet: { paddingBottom: 40, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: HANDLE_OFFSET },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 20, marginBottom: 12 },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  themeInfo: { flex: 1 },
  emergencyPad: { padding: 16, gap: 12 },
  blockCard: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  halfButton: { flex: 1 },
  sharePayload: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  logRow: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  dialog: { margin: 24, padding: 24 },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogBtn: { flex: 1 },
});
