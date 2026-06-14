import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Card } from '../primitives/card';
import { Button } from '../primitives/button';
import { EmptyState } from '../primitives/feedback/empty-state';
import { isMobileFeatureEnabled } from '../../config/feature-flags';
import { useIsOffline } from '../../hooks/use-network-status';
import { localizeDisplayMessage } from '../../api/error-message';

interface EmptyConfig {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

interface ApiStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  /** When loading=true and skeleton provided, renders skeleton instead of spinner */
  skeleton?: React.ReactNode;
  /** When isEmpty=true from useApiQuery, renders EmptyState instead of the card */
  empty?: EmptyConfig;
  isEmpty?: boolean;
}

export function ApiState({
  title,
  message,
  actionLabel,
  onAction,
  loading,
  skeleton,
  empty,
  isEmpty,
}: ApiStateProps) {
  const t = useTheme();
  const { t: i18n } = useTranslation();
  const isOffline = useIsOffline();

  if (loading && skeleton) {
    return <>{skeleton}</>;
  }

  if (isEmpty && empty) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        message={empty.body}
        actionLabel={empty.ctaLabel}
        onAction={empty.onCta}
      />
    );
  }

  // When not loading and there's an error condition, surface a no-internet message instead
  const resolvedTitle = !loading && isOffline && !isEmpty ? i18n('api.offlineTitle', { defaultValue: 'No internet connection' }) : title;
  const displayMessage = !loading && !isEmpty ? localizeDisplayMessage(message) : message;
  const resolvedMessage = !loading && isOffline && !isEmpty
    ? i18n('api.offlineMessage', { defaultValue: 'Please check your connection and try again.' })
    : displayMessage;

  return (
    <Card style={styles.card}>
      {loading && <ActivityIndicator color={t.brand} />}
      <View style={styles.copy}>
        <Text style={[typography.bodyMed, { color: t.ink, textAlign: 'center' }]}>{resolvedTitle}</Text>
        {resolvedMessage && (
          <Text style={[typography.caption, { color: t.ink3, textAlign: 'center', marginTop: 4 }]}>
            {resolvedMessage}
          </Text>
        )}
      </View>
      {actionLabel && onAction && <Button label={actionLabel} variant="soft" onPress={onAction} />}
    </Card>
  );
}

export function MissingApiState({ title, contract }: { title: string; contract: string }) {
  const { t: i18n } = useTranslation();
  const showContract = isMobileFeatureEnabled('missingApiDiagnostics');

  return (
    <ApiState
      title={title}
      message={showContract
        ? i18n('api.missingApiDevMessage', {
          contract,
          defaultValue: `API status: ${contract}. This flow is guarded until the backend contract is confirmed.`,
        })
        : i18n('api.missingApiProductionMessage', {
          defaultValue: 'This feature is not available in the current mobile release.',
        })}
    />
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, marginVertical: 8 },
  copy: { gap: 2 },
});
