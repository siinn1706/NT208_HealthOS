export const PERMISSION_KINDS = ['notifications', 'camera', 'health'] as const;

export type PermissionKind = (typeof PERMISSION_KINDS)[number];

export function isValidPermissionKind(value: string): value is PermissionKind {
  return (PERMISSION_KINDS as readonly string[]).includes(value);
}
