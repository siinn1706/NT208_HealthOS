import React, { useState, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/screen';
import { TopBar } from '../../src/components/layout/top-bar';
import { IconButton } from '../../src/components/primitives/icon-button';
import { ApiState } from '../../src/components/api/api-state';
import { IdentityCard } from '../../src/components/profile/identity-card';
import { EmergencyCard } from '../../src/components/profile/emergency-card';
import { MenuGroup } from '../../src/components/profile/menu-group';
import {
  AppearanceSheet,
  SettingsSheet,
  EmergencySheet,
  SignOutModal,
  MissingApiModal,
} from '../../src/components/profile/me-screen-modals';
import { IconSettings } from '../../src/icons';
import { useTheme } from '../../src/theme/useTheme';
import { typography } from '../../src/theme/typography';
import { useSession } from '../../src/auth/session-provider';
import { profileMenuGroups, toIdentity } from '../../src/api/viewModels';

export default function MeScreen() {
  const t = useTheme();
  const router = useRouter();
  const session = useSession();

  const identity = toIdentity(session.user);

  // Sheet / modal visibility
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Single shared "not yet available" modal
  const [missingApiOpen, setMissingApiOpen] = useState(false);
  const [missingApiTitle, setMissingApiTitle] = useState('');

  function openMissingApi(title: string) {
    setMissingApiTitle(title);
    setMissingApiOpen(true);
  }

  // Emergency share — no real share API yet
  function handleEmergencyShare() {
    openMissingApi('Emergency share not yet available');
  }

  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true);
    setSignOutError(null);
    try {
      await session.signOut();
      router.replace('/auth/welcome');
    } catch {
      setSignOutError('Sign out failed. Please try again.');
    } finally {
      setSignOutLoading(false);
    }
  }, [session, router]);

  function handleMenuPress(id: string) {
    switch (id) {
      case 'appearance':  setAppearanceOpen(true); break;
      case 'profile':     router.push('/auth/setup'); break;
      case 'devices':     router.push('/profile/devices' as never); break;
      case 'emergency':   setEmergencyOpen(true); break;
      case 'goals':       router.push('/insights/goals' as never); break;
      case 'achievements': router.push('/insights/goals/milestones' as never); break;
      case 'security':    router.push('/profile/security' as never); break;
      // 'app-lock' toggle is handled inside MenuRow (local state only —
      //  UserPreference has no app_lock field, so we do not persist it)
      case 'notifications': router.push('/onboarding/permissions/notifications' as never); break;
      case 'language':    openMissingApi('Language settings not yet available'); break;
      case 'logout':      setSignOutOpen(true); break;
      default: break;
    }
  }

  return (
    <>
      <Screen>
        <TopBar
          title="Me"
          right={
            <IconButton
              variant="subtle"
              icon={<IconSettings size={20} color={t.ink3} />}
              accessibilityLabel="Settings"
              onPress={() => setSettingsOpen(true)}
            />
          }
        />

        {session.booting && <ApiState title="Loading profile" loading />}
        {session.error && (
          <ApiState
            title="Profile sync issue"
            message={session.error}
            actionLabel="Retry"
            onAction={session.refreshUser}
          />
        )}

        <IdentityCard {...identity} />

        <EmergencyCard variant="soft" onShare={() => setEmergencyOpen(true)} />

        {profileMenuGroups.map((g) => (
          <MenuGroup key={g.title} title={g.title} items={g.items} onItemPress={handleMenuPress} />
        ))}

        <Text style={[typography.micro, { color: t.ink4, textAlign: 'center', marginTop: 20 }]}>
          NT208 HealthOS · v0.1.0 (mobile)
        </Text>
      </Screen>

      <AppearanceSheet visible={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <SettingsSheet   visible={settingsOpen}   onClose={() => setSettingsOpen(false)} />
      <EmergencySheet
        visible={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onShare={handleEmergencyShare}
      />
      <SignOutModal
        visible={signOutOpen}
        loading={signOutLoading}
        error={signOutError}
        onConfirm={handleSignOut}
        onCancel={() => { setSignOutOpen(false); setSignOutError(null); }}
      />
      <MissingApiModal
        visible={missingApiOpen}
        title={missingApiTitle}
        onClose={() => setMissingApiOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({});
