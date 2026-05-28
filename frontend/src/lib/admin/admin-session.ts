// admin-session.ts — isAdmin predicate and role/permission constants

export const ADMIN_ROLE = "admin";
export const ADMIN_PERMISSION = "admin.access";

/**
 * Returns true if the user holds the admin role or the admin.access permission.
 * Handles null/undefined and non-array inputs safely by returning false.
 */
export function isAdmin(
  roles: readonly string[] | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  return (
    (Array.isArray(roles) && roles.includes(ADMIN_ROLE)) ||
    (Array.isArray(permissions) && permissions.includes(ADMIN_PERMISSION))
  );
}
