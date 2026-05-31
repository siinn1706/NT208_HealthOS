import { useLocalSearchParams } from 'expo-router';
import { AuthFlowScreen } from '../../../src/components/auth/auth-flow-screen';

type PermissionKind = 'notifications' | 'camera' | 'health-data';

const PERMISSION_KINDS: readonly PermissionKind[] = ['notifications', 'camera', 'health-data'];

function toPermissionKind(value: unknown): PermissionKind {
  const kind = Array.isArray(value) ? value[0] : value;
  return typeof kind === 'string' && PERMISSION_KINDS.includes(kind as PermissionKind)
    ? kind as PermissionKind
    : 'notifications';
}

export default function PermissionsRoute() {
  const { kind } = useLocalSearchParams();
  return <AuthFlowScreen kind="permissions" permissionKind={toPermissionKind(kind)} />;
}
