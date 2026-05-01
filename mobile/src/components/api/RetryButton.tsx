import React from 'react';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';

interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  label?: string;
}

export function RetryButton({ onRetry, loading, label = 'Try again' }: RetryButtonProps) {
  const t = useTheme();

  return (
    <Button
      label={label}
      variant="soft"
      size="sm"
      loading={loading}
      icon={<RefreshCw size={14} color={t.brand} />}
      onPress={onRetry}
    />
  );
}
