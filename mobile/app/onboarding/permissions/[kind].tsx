import { useLocalSearchParams } from 'expo-router';
import { AuthFlowScreen } from '../../../src/components/auth/AuthFlowScreen';

export default function PermissionsRoute() {
  const { kind } = useLocalSearchParams<{ kind: 'notifications' | 'camera' | 'health-data' }>();
  return <AuthFlowScreen kind="permissions" permissionKind={kind ?? 'notifications'} />;
}
